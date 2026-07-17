import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentProvider, PaymentStatus, WebhookEventType } from '@paylab/shared';
import { StripeAdapter } from './stripe.adapter';
import { ApiCallLogService } from '../../payment/api-call-log.service';

// A syntactically valid test key. The Stripe client is constructed but never reaches the
// network: paymentIntents.create is stubbed, and webhook verification is local crypto.
const TEST_SECRET_KEY = 'sk_test_00000000000000000000000000';
const TEST_WEBHOOK_SECRET = 'whsec_00000000000000000000000000000000';

const config = {
  get: (key: string) =>
    ({
      STRIPE_SECRET_KEY: TEST_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    })[key],
} as unknown as ConfigService;

function buildPaymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_test_123',
    status: 'succeeded',
    client_secret: 'pi_test_123_secret_abc',
    amount: 5000,
    currency: 'usd',
    next_action: null,
    ...overrides,
  };
}

describe('StripeAdapter', () => {
  let adapter: StripeAdapter;
  let apiCallLog: { logCall: jest.Mock };
  let createSpy: jest.SpyInstance;

  beforeEach(() => {
    apiCallLog = { logCall: jest.fn() };
    adapter = new StripeAdapter(config, apiCallLog as unknown as ApiCallLogService);

    const stripe = (adapter as unknown as { stripe: Stripe }).stripe;
    createSpy = jest
      .spyOn(stripe.paymentIntents, 'create')
      .mockImplementation(async () => buildPaymentIntent() as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const baseInput = {
    provider: PaymentProvider.STRIPE,
    amount: 50,
    currency: 'USD',
  };

  describe('idempotency', () => {
    it('sends an idempotency key even when the caller does not supply one', async () => {
      await adapter.createCharge(baseInput);

      expect(createSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      );
    });

    it('forwards the caller idempotency key verbatim so a retry cannot double charge', async () => {
      await adapter.createCharge({ ...baseInput, idempotencyKey: 'order-4821-attempt-1' });

      expect(createSpy).toHaveBeenCalledWith(
        expect.anything(),
        { idempotencyKey: 'order-4821-attempt-1' },
      );
    });

    it('generates a distinct key per call when none is supplied', async () => {
      await adapter.createCharge(baseInput);
      await adapter.createCharge(baseInput);

      const [, firstOptions] = createSpy.mock.calls[0];
      const [, secondOptions] = createSpy.mock.calls[1];
      expect(firstOptions.idempotencyKey).not.toEqual(secondOptions.idempotencyKey);
    });
  });

  describe('3DS / SCA', () => {
    it('surfaces the redirect url when the card requires action', async () => {
      createSpy.mockImplementation(
        async () =>
          buildPaymentIntent({
            id: 'pi_test_3ds',
            status: 'requires_action',
            next_action: {
              type: 'redirect_to_url',
              redirect_to_url: { url: 'https://hooks.stripe.com/3ds/authenticate' },
            },
          }) as never,
      );

      const result = await adapter.createCharge(baseInput);

      expect(result.redirectUrl).toBe('https://hooks.stripe.com/3ds/authenticate');
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.clientSecret).toBeDefined();
    });

    it('leaves redirectUrl undefined when no action is required', async () => {
      const result = await adapter.createCharge(baseInput);

      expect(result.redirectUrl).toBeUndefined();
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    });
  });

  describe('verifyWebhook', () => {
    const payload = JSON.stringify({
      id: 'evt_test_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123' } },
    });

    function sign(body: string): string {
      const stripe = (adapter as unknown as { stripe: Stripe }).stripe;
      return stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret: TEST_WEBHOOK_SECRET,
      });
    }

    it('accepts a genuinely signed payload and normalises the event', async () => {
      const event = await adapter.verifyWebhook(
        { 'stripe-signature': sign(payload) },
        payload,
      );

      expect(event.eventId).toBe('evt_test_1');
      expect(event.eventType).toBe(WebhookEventType.CHARGE_SUCCEEDED);
      expect(event.chargeId).toBe('pi_test_123');
      expect(event.provider).toBe(PaymentProvider.STRIPE);
      expect(event.verified).toBe(true);
    });

    it('rejects a body tampered with after signing', async () => {
      const signature = sign(payload);
      const tampered = payload.replace('pi_test_123', 'pi_attacker_999');

      await expect(
        adapter.verifyWebhook({ 'stripe-signature': signature }, tampered),
      ).rejects.toThrow();
    });

    it('rejects a payload signed with the wrong secret', async () => {
      const stripe = (adapter as unknown as { stripe: Stripe }).stripe;
      const foreignSignature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: 'whsec_11111111111111111111111111111111',
      });

      await expect(
        adapter.verifyWebhook({ 'stripe-signature': foreignSignature }, payload),
      ).rejects.toThrow();
    });

    it('rejects a missing signature header', async () => {
      await expect(adapter.verifyWebhook({}, payload)).rejects.toThrow();
    });
  });
});
