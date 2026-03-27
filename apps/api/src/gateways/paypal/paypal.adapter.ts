import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentStatus,
  WebhookEventType,
  PaymentGatewayAdapter,
  CreateChargeInput,
  ChargeResult,
  ChargeStatusResult,
  RefundInput,
  RefundResult,
  WebhookEvent,
} from '@pay-gate-simulator/shared';

// PayPal SDK v2 imports
import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  LogLevel,
  OrdersController,
  PaymentsController,
} from '@paypal/paypal-server-sdk';

@Injectable()
export class PaypalAdapter implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.PAYPAL;
  private readonly logger = new Logger(PaypalAdapter.name);
  private client: Client | null = null;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    if (clientId && clientSecret) {
      this.client = new Client({
        clientCredentialsAuthCredentials: {
          oAuthClientId: clientId,
          oAuthClientSecret: clientSecret,
        },
        environment: Environment.Sandbox,
        logging: {
          logLevel: LogLevel.Info,
          logRequest: { logBody: false },
          logResponse: { logBody: false },
        },
      });
    }
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.ensureInitialized();

    const ordersController = new OrdersController(this.client!);
    const mockCode = input.metadata?.paypalMockCode;

    // Determine if mock code targets order creation
    const createPhaseCodes = ['INTERNAL_SERVER_ERROR', 'PERMISSION_DENIED'];
    const isCreatePhase = mockCode && createPhaseCodes.includes(mockCode);

    try {
      const response = await ordersController.createOrder({
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              amount: {
                currencyCode: input.currency.toUpperCase(),
                value: input.amount.toFixed(2),
              },
              description: input.description,
            },
          ],
          applicationContext: {
            returnUrl: input.returnUrl || 'http://localhost:3200/paypal/return',
            cancelUrl: input.returnUrl
              ? input.returnUrl.replace('/return', '/cancel')
              : 'http://localhost:3200/paypal/cancel',
          },
        },
        paypalMockResponse: isCreatePhase
          ? JSON.stringify({ mock_application_codes: mockCode })
          : undefined,
      });

      const order = response.result;
      const approvalLink = (order as any).links?.find(
        (l: { rel: string }) => l.rel === 'approve',
      );

      return {
        chargeId: (order as any).id || '',
        provider: PaymentProvider.PAYPAL,
        status: this.mapPaypalOrderStatus((order as any).status || ''),
        amount: input.amount,
        currency: input.currency,
        redirectUrl: approvalLink?.href,
        rawResponse: order as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ApiError) {
        const details = (error.result as any)?.details;
        const issue = details?.[0]?.issue || error.message;
        this.logger.warn(`PayPal createOrder failed: ${issue}`);
        return {
          chargeId: '',
          provider: PaymentProvider.PAYPAL,
          status: PaymentStatus.FAILED,
          amount: input.amount,
          currency: input.currency,
          rawResponse: {
            error: error.message,
            issue,
            details: error.result as Record<string, unknown>,
          },
          createdAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  }

  async captureOrder(orderId: string, mockCode?: string): Promise<ChargeResult> {
    this.ensureInitialized();

    const ordersController = new OrdersController(this.client!);

    try {
      const response = await ordersController.captureOrder({
        id: orderId,
        paypalMockResponse: mockCode
          ? JSON.stringify({ mock_application_codes: mockCode })
          : undefined,
      });
      const order = response.result;

      const capture = (order as any).purchaseUnits?.[0]?.payments?.captures?.[0];
      const amount = capture?.amount || (order as any).purchaseUnits?.[0]?.amount;

      return {
        chargeId: (order as any).id || orderId,
        provider: PaymentProvider.PAYPAL,
        status: this.mapPaypalOrderStatus((order as any).status || ''),
        amount: parseFloat(amount?.value || '0'),
        currency: (amount?.currencyCode || 'USD').toUpperCase(),
        rawResponse: order as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ApiError) {
        const details = (error.result as any)?.details;
        const issue = details?.[0]?.issue || error.message;
        const description = details?.[0]?.description || '';
        this.logger.warn(`PayPal captureOrder failed: ${issue} - ${description}`);
        return {
          chargeId: orderId,
          provider: PaymentProvider.PAYPAL,
          status: PaymentStatus.FAILED,
          amount: 0,
          currency: 'USD',
          rawResponse: {
            error: error.message,
            issue,
            description,
            details: error.result as Record<string, unknown>,
          },
          createdAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  }

  async getChargeStatus(chargeId: string): Promise<ChargeStatusResult> {
    this.ensureInitialized();

    const ordersController = new OrdersController(this.client!);
    const response = await ordersController.getOrder({ id: chargeId });
    const order = response.result;

    const amount = (order as any).purchaseUnits?.[0]?.amount;
    return {
      chargeId: (order as any).id || chargeId,
      provider: PaymentProvider.PAYPAL,
      status: this.mapPaypalOrderStatus((order as any).status || ''),
      amount: parseFloat(amount?.value || '0'),
      currency: (amount?.currencyCode || 'USD').toUpperCase(),
      rawResponse: order as unknown as Record<string, unknown>,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    this.ensureInitialized();

    // PayPal refunds against a capture ID, not order ID
    const paymentsController = new PaymentsController(this.client!);
    const response = await paymentsController.refundCapturedPayment({
      captureId: input.chargeId,
      body: {
        amount: input.amount
          ? {
            currencyCode: 'USD',
            value: input.amount.toFixed(2),
          }
          : undefined,
        noteToPayer: input.reason,
      },
    });

    const refund = response.result;
    return {
      refundId: (refund as any).id || '',
      chargeId: input.chargeId,
      provider: PaymentProvider.PAYPAL,
      status:
        (refund as any).status === 'COMPLETED'
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PENDING,
      amount: input.amount || 0,
      currency: 'USD',
      rawResponse: refund as unknown as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    body: string,
  ): Promise<WebhookEvent> {
    // PayPal webhook verification requires calling their verify-webhook-signature API
    // For sandbox testing, parse the body and trust it
    const parsed = JSON.parse(body);

    return {
      eventId: parsed.id || `pp_evt_${Date.now()}`,
      provider: PaymentProvider.PAYPAL,
      eventType: this.mapPaypalEventType(parsed.event_type || ''),
      chargeId: parsed.resource?.id,
      payload: parsed,
      verified: false,
      receivedAt: new Date().toISOString(),
    };
  }

  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error(
        'PayPal client not initialized. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
  }

  private mapPaypalOrderStatus(status: string): PaymentStatus {
    const map: Record<string, PaymentStatus> = {
      CREATED: PaymentStatus.PENDING,
      SAVED: PaymentStatus.PENDING,
      APPROVED: PaymentStatus.PROCESSING,
      VOIDED: PaymentStatus.CANCELLED,
      COMPLETED: PaymentStatus.SUCCEEDED,
      PAYER_ACTION_REQUIRED: PaymentStatus.PENDING,
    };
    return map[status] || PaymentStatus.PENDING;
  }

  private mapPaypalEventType(eventType: string): WebhookEventType {
    const map: Record<string, WebhookEventType> = {
      'PAYMENT.CAPTURE.COMPLETED': WebhookEventType.CHARGE_SUCCEEDED,
      'PAYMENT.CAPTURE.DENIED': WebhookEventType.CHARGE_FAILED,
      'PAYMENT.CAPTURE.PENDING': WebhookEventType.CHARGE_PENDING,
      'PAYMENT.CAPTURE.REFUNDED': WebhookEventType.REFUND_SUCCEEDED,
    };
    return map[eventType] || WebhookEventType.CHARGE_PENDING;
  }
}
