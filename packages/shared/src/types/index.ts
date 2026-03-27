import {
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
  WebhookEventType,
} from '../enums';

// -- Charge --

export interface CreateChargeInput {
  provider: PaymentProvider;
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  // Stripe test PaymentMethod token (e.g. pm_card_visa)
  testPaymentMethod?: string;
  description?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
}

export interface ChargeResult {
  chargeId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  redirectUrl?: string;
  clientSecret?: string;
  rawResponse?: Record<string, unknown>;
  createdAt: string;
}

export interface ChargeStatusResult {
  chargeId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt?: string;
  rawResponse?: Record<string, unknown>;
}

// -- Refund --

export interface RefundInput {
  chargeId: string;
  provider: PaymentProvider;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  chargeId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  rawResponse?: Record<string, unknown>;
  createdAt: string;
}

// -- Webhook --

export interface WebhookEvent {
  eventId: string;
  provider: PaymentProvider;
  eventType: WebhookEventType;
  chargeId?: string;
  refundId?: string;
  payload: Record<string, unknown>;
  verified: boolean;
  receivedAt: string;
}

// -- Test Scenario --

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  provider: PaymentProvider;
  // For Stripe: test PaymentMethod token (e.g. pm_card_visa)
  testPaymentMethod?: string;
  // PayPal sandbox negative testing mock code (e.g. INSTRUMENT_DECLINED)
  paypalMockCode?: string;
  expectedStatus: PaymentStatus;
  amount: number;
  currency: string;
}

// -- Gateway Interface --

export interface PaymentGatewayAdapter {
  readonly provider: PaymentProvider;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getChargeStatus(chargeId: string): Promise<ChargeStatusResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(
    headers: Record<string, string>,
    body: string,
  ): Promise<WebhookEvent>;
}
