import { FindOperator, QueryFailedError } from 'typeorm';
import {
  PaymentProvider,
  PaymentStatus,
  TransactionType,
  WebhookEvent,
  WebhookEventType,
} from '@paylab/shared';
import { WebhooksService } from './webhooks.service';

function buildEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    eventId: 'evt_test_1',
    provider: PaymentProvider.STRIPE,
    eventType: WebhookEventType.CHARGE_SUCCEEDED,
    chargeId: 'pi_test_123',
    payload: { id: 'evt_test_1' },
    verified: true,
    receivedAt: new Date().toISOString(),
    ...overrides,
  };
}

function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('INSERT INTO webhook_events', [], {
    code: '23505',
  } as unknown as Error);
}

describe('WebhooksService', () => {
  let service: WebhooksService;
  let webhookEventRepo: { insert: jest.Mock };
  let transactionRepo: { update: jest.Mock };
  let apiCallLog: { logCall: jest.Mock };
  let verifyWebhook: jest.Mock;

  const rawBody = JSON.stringify({ id: 'evt_test_1' });

  function build(event: WebhookEvent = buildEvent()) {
    verifyWebhook = jest.fn().mockResolvedValue(event);
    webhookEventRepo = { insert: jest.fn().mockResolvedValue({}) };
    transactionRepo = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    apiCallLog = { logCall: jest.fn() };

    const gatewayRegistry = { getAdapter: jest.fn().mockReturnValue({ verifyWebhook }) };

    service = new WebhooksService(
      webhookEventRepo as never,
      transactionRepo as never,
      gatewayRegistry as never,
      apiCallLog as never,
    );
    return event;
  }

  beforeEach(() => build());

  describe('first delivery', () => {
    it('stores the event and settles the transaction', async () => {
      await service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody);

      expect(webhookEventRepo.insert).toHaveBeenCalledTimes(1);
      expect(transactionRepo.update).toHaveBeenCalledTimes(1);
      expect(apiCallLog.logCall).toHaveBeenCalledTimes(1);
    });

    it('settles a succeeded charge event to SUCCEEDED', async () => {
      await service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody);

      const [where, patch] = transactionRepo.update.mock.calls[0];
      expect(patch).toEqual({ status: PaymentStatus.SUCCEEDED });
      expect(where).toEqual(
        expect.objectContaining({
          provider: PaymentProvider.STRIPE,
          externalId: 'pi_test_123',
          transactionType: TransactionType.CHARGE,
        }),
      );
    });

    it('verifies the signature before storing anything', async () => {
      verifyWebhook.mockRejectedValue(new Error('bad signature'));

      await expect(
        service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody),
      ).rejects.toThrow('bad signature');

      expect(webhookEventRepo.insert).not.toHaveBeenCalled();
      expect(transactionRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('replay protection', () => {
    it('ignores a duplicate event without re-settling or re-logging', async () => {
      webhookEventRepo.insert.mockRejectedValue(uniqueViolation());

      const result = await service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody);

      expect(result.eventId).toBe('evt_test_1');
      expect(transactionRepo.update).not.toHaveBeenCalled();
      expect(apiCallLog.logCall).not.toHaveBeenCalled();
    });

    it('rethrows insert failures that are not unique violations', async () => {
      webhookEventRepo.insert.mockRejectedValue(
        new QueryFailedError('INSERT', [], { code: '08006' } as unknown as Error),
      );

      await expect(
        service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody),
      ).rejects.toBeInstanceOf(QueryFailedError);
    });
  });

  describe('no-downgrade guard', () => {
    // The overwritable set is the whole guard: a status must be strictly behind the
    // target to be replaced, so an out-of-order event cannot un-succeed a paid charge.
    function overwritableStatuses(): PaymentStatus[] {
      const [where] = transactionRepo.update.mock.calls[0];
      const operator = where.status as FindOperator<PaymentStatus>;
      return operator.value as unknown as PaymentStatus[];
    }

    it('never overwrites a terminal status when settling to SUCCEEDED', async () => {
      await service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody);

      const allowed = overwritableStatuses();
      expect(allowed).toEqual(
        expect.arrayContaining([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
      );
      expect(allowed).not.toContain(PaymentStatus.SUCCEEDED);
      expect(allowed).not.toContain(PaymentStatus.FAILED);
      expect(allowed).not.toContain(PaymentStatus.REFUNDED);
    });

    it('only advances a pending charge when a late processing event arrives', async () => {
      build(buildEvent({ eventType: WebhookEventType.CHARGE_PENDING }));

      await service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody);

      const [, patch] = transactionRepo.update.mock.calls[0];
      expect(patch).toEqual({ status: PaymentStatus.PROCESSING });

      const allowed = overwritableStatuses();
      expect(allowed).toEqual([PaymentStatus.PENDING]);
      expect(allowed).not.toContain(PaymentStatus.SUCCEEDED);
    });

    it('reports when nothing was settled rather than forcing a write', async () => {
      transactionRepo.update.mockResolvedValue({ affected: 0 });

      await expect(
        service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody),
      ).resolves.toBeDefined();
    });
  });

  describe('scope', () => {
    it('does not settle transactions for refund events', async () => {
      build(buildEvent({ eventType: WebhookEventType.REFUND_SUCCEEDED }));

      await service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody);

      expect(webhookEventRepo.insert).toHaveBeenCalledTimes(1);
      expect(transactionRepo.update).not.toHaveBeenCalled();
    });

    it('does not settle when the event carries no charge id', async () => {
      build(buildEvent({ chargeId: undefined }));

      await service.handleWebhook(PaymentProvider.STRIPE, {}, rawBody);

      expect(transactionRepo.update).not.toHaveBeenCalled();
    });
  });
});
