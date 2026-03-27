import { PaymentProvider, PaymentStatus, PaymentMethod, WebhookEventType, GatewayMode } from '../enums';
export interface CreateChargeInput {
    provider: PaymentProvider;
    amount: number;
    currency: string;
    paymentMethod?: PaymentMethod;
    description?: string;
    metadata?: Record<string, string>;
    returnUrl?: string;
    mock?: boolean;
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
    mock: boolean;
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
    mock: boolean;
}
export interface RefundInput {
    chargeId: string;
    provider: PaymentProvider;
    amount?: number;
    reason?: string;
    mock?: boolean;
}
export interface RefundResult {
    refundId: string;
    chargeId: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number;
    currency: string;
    rawResponse?: Record<string, unknown>;
    mock: boolean;
    createdAt: string;
}
export interface DisburseInput {
    provider: PaymentProvider;
    amount: number;
    currency: string;
    recipientEmail?: string;
    recipientAccountId?: string;
    description?: string;
    metadata?: Record<string, string>;
    mock?: boolean;
}
export interface DisbursementResult {
    disbursementId: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number;
    currency: string;
    recipientEmail?: string;
    rawResponse?: Record<string, unknown>;
    mock: boolean;
    createdAt: string;
}
export interface WebhookEvent {
    eventId: string;
    provider: PaymentProvider;
    eventType: WebhookEventType;
    chargeId?: string;
    refundId?: string;
    disbursementId?: string;
    payload: Record<string, unknown>;
    verified: boolean;
    mock: boolean;
    receivedAt: string;
}
export interface GatewayConfig {
    id: string;
    provider: PaymentProvider;
    mode: GatewayMode;
    displayName: string;
    sandboxCredentials?: Record<string, string>;
    mockConfig?: MockConfig;
    createdAt: string;
    updatedAt: string;
}
export interface MockConfig {
    successRate: number;
    latencyMs: number;
    defaultErrorCode?: string;
}
export interface PaymentGatewayAdapter {
    readonly provider: PaymentProvider;
    createCharge(input: CreateChargeInput): Promise<ChargeResult>;
    getChargeStatus(chargeId: string): Promise<ChargeStatusResult>;
    refund(input: RefundInput): Promise<RefundResult>;
    disburse(input: DisburseInput): Promise<DisbursementResult>;
    verifyWebhook(headers: Record<string, string>, body: string): Promise<WebhookEvent>;
}
//# sourceMappingURL=index.d.ts.map