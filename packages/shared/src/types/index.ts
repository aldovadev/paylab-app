import {
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
  WebhookEventType,
  CallDirection,
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
  // Caller-supplied key so a retried request cannot double charge.
  // Generated per call when omitted, which only covers SDK-internal retries.
  idempotencyKey?: string;
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

// -- API Call Log --

export interface ApiCallLog {
  id: string;
  flowId: string;
  provider: PaymentProvider;
  direction: CallDirection;
  method: string;
  endpoint: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  responseHeaders?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  durationMs?: number;
  createdAt: string;
}

// -- Flow Summary --

export interface FlowSummary {
  transaction: {
    id: string;
    provider: string;
    transactionType: string;
    status: string;
    externalId: string;
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
    createdAt: string;
  };
  relatedTransactions: {
    id: string;
    provider: string;
    transactionType: string;
    status: string;
    externalId: string;
    amount: number;
    currency: string;
    createdAt: string;
  }[];
  apiCalls: ApiCallLog[];
  webhookEvents: WebhookEvent[];
}
