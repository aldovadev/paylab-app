import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  PaymentStatus,
  WebhookEventType,
  CallDirection,
  PaymentGatewayAdapter,
  CreateChargeInput,
  ChargeResult,
  ChargeStatusResult,
  RefundInput,
  RefundResult,
  WebhookEvent,
} from '@paylab/shared';
import { ApiCallLogService } from '../../payment/api-call-log.service';

@Injectable()
export class StripeAdapter implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.STRIPE;
  private readonly logger = new Logger(StripeAdapter.name);
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiCallLogService: ApiCallLogService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.ensureInitialized();

    // Build PaymentIntent params
    // If testPaymentMethod is provided (e.g. pm_card_visa), confirm server-side immediately
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(input.amount * 100),
      currency: input.currency.toLowerCase(),
      description: input.description,
      metadata: input.metadata || {},
    };

    if (input.testPaymentMethod) {
      params.payment_method = input.testPaymentMethod;
      params.confirm = true;
      params.automatic_payment_methods = { enabled: true, allow_redirects: 'never' };
    } else {
      params.automatic_payment_methods = { enabled: true };
    }

    const startTime = Date.now();
    const endpoint = '/v1/payment_intents';

    try {
      const paymentIntent = await this.stripe.paymentIntents.create(params);
      const lastResp = (paymentIntent as any).lastResponse;

      this.apiCallLogService.logCall({
        flowId: paymentIntent.id,
        provider: PaymentProvider.STRIPE,
        direction: CallDirection.OUTBOUND,
        method: 'POST',
        endpoint,
        requestBody: params as unknown as Record<string, unknown>,
        responseStatus: lastResp?.statusCode || 200,
        responseHeaders: lastResp?.headers as Record<string, unknown> || undefined,
        responseBody: paymentIntent as unknown as Record<string, unknown>,
        durationMs: Date.now() - startTime,
      });

      return {
        chargeId: paymentIntent.id,
        provider: PaymentProvider.STRIPE,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: input.amount,
        currency: input.currency,
        clientSecret: paymentIntent.client_secret || undefined,
        rawResponse: paymentIntent as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError) {
        this.logger.warn(`Card declined: ${err.code} - ${err.message}`);

        this.apiCallLogService.logCall({
          flowId: err.payment_intent?.id || '',
          provider: PaymentProvider.STRIPE,
          direction: CallDirection.OUTBOUND,
          method: 'POST',
          endpoint,
          requestBody: params as unknown as Record<string, unknown>,
          responseStatus: err.statusCode || 402,
          responseBody: {
            type: err.type,
            code: err.code,
            declineCode: err.decline_code,
            message: err.message,
          },
          durationMs: Date.now() - startTime,
        });

        return {
          chargeId: err.payment_intent?.id || '',
          provider: PaymentProvider.STRIPE,
          status: PaymentStatus.FAILED,
          amount: input.amount,
          currency: input.currency,
          rawResponse: {
            error: {
              type: err.type,
              code: err.code,
              declineCode: err.decline_code,
              message: err.message,
            },
            paymentIntent: err.payment_intent as unknown as Record<string, unknown>,
          },
          createdAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  async getChargeStatus(chargeId: string): Promise<ChargeStatusResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    const endpoint = `/v1/payment_intents/${chargeId}`;
    const paymentIntent = await this.stripe.paymentIntents.retrieve(chargeId);
    const lastResp = (paymentIntent as any).lastResponse;

    this.apiCallLogService.logCall({
      flowId: chargeId,
      provider: PaymentProvider.STRIPE,
      direction: CallDirection.OUTBOUND,
      method: 'GET',
      endpoint,
      responseStatus: lastResp?.statusCode || 200,
      responseHeaders: lastResp?.headers as Record<string, unknown> || undefined,
      responseBody: paymentIntent as unknown as Record<string, unknown>,
      durationMs: Date.now() - startTime,
    });

    return {
      chargeId: paymentIntent.id,
      provider: PaymentProvider.STRIPE,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      rawResponse: paymentIntent as unknown as Record<string, unknown>,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    const endpoint = '/v1/refunds';
    const refund = await this.stripe.refunds.create({
      payment_intent: input.chargeId,
      amount: input.amount ? Math.round(input.amount * 100) : undefined,
      reason: input.reason as Stripe.RefundCreateParams.Reason || undefined,
    });
    const lastResp = (refund as any).lastResponse;

    this.apiCallLogService.logCall({
      flowId: input.chargeId,
      provider: PaymentProvider.STRIPE,
      direction: CallDirection.OUTBOUND,
      method: 'POST',
      endpoint,
      requestBody: { paymentIntent: input.chargeId, amount: input.amount, reason: input.reason },
      responseStatus: lastResp?.statusCode || 200,
      responseHeaders: lastResp?.headers as Record<string, unknown> || undefined,
      responseBody: refund as unknown as Record<string, unknown>,
      durationMs: Date.now() - startTime,
    });

    return {
      refundId: refund.id,
      chargeId: input.chargeId,
      provider: PaymentProvider.STRIPE,
      status: refund.status === 'succeeded' ? PaymentStatus.REFUNDED : PaymentStatus.PENDING,
      amount: (refund.amount || 0) / 100,
      currency: (refund.currency || 'usd').toUpperCase(),
      rawResponse: refund as unknown as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    };
  }

  async verifyWebhook(headers: Record<string, string>, body: string): Promise<WebhookEvent> {
    this.ensureInitialized();

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    const sig = headers['stripe-signature'] || '';

    const event = this.stripe.webhooks.constructEvent(body, sig, webhookSecret || '');

    return {
      eventId: event.id,
      provider: PaymentProvider.STRIPE,
      eventType: this.mapStripeEventType(event.type),
      chargeId: (event.data.object as { id?: string })?.id,
      payload: event as unknown as Record<string, unknown>,
      verified: true,
      receivedAt: new Date().toISOString(),
    };
  }

  private ensureInitialized(): void {
    if (!this.stripe) {
      throw new Error('Stripe SDK not initialized. Set STRIPE_SECRET_KEY in environment.');
    }
  }

  private mapStripeStatus(status: string): PaymentStatus {
    const map: Record<string, PaymentStatus> = {
      requires_payment_method: PaymentStatus.PENDING,
      requires_confirmation: PaymentStatus.PENDING,
      requires_action: PaymentStatus.PENDING,
      processing: PaymentStatus.PROCESSING,
      succeeded: PaymentStatus.SUCCEEDED,
      canceled: PaymentStatus.CANCELLED,
      requires_capture: PaymentStatus.PROCESSING,
    };
    return map[status] || PaymentStatus.PENDING;
  }

  private mapStripeEventType(eventType: string): WebhookEventType {
    const map: Record<string, WebhookEventType> = {
      'payment_intent.succeeded': WebhookEventType.CHARGE_SUCCEEDED,
      'payment_intent.payment_failed': WebhookEventType.CHARGE_FAILED,
      'payment_intent.processing': WebhookEventType.CHARGE_PENDING,
      'charge.refunded': WebhookEventType.REFUND_SUCCEEDED,
      'charge.refund.updated': WebhookEventType.REFUND_SUCCEEDED,
    };
    return map[eventType] || WebhookEventType.CHARGE_PENDING;
  }
}
