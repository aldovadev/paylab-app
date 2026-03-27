export declare enum PaymentProvider {
    STRIPE = "stripe",
    PAYPAL = "paypal"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded",
    PARTIALLY_REFUNDED = "partially_refunded"
}
export declare enum PaymentMethod {
    CARD = "card",
    BANK_TRANSFER = "bank_transfer",
    PAYPAL_BALANCE = "paypal_balance",
    WALLET = "wallet"
}
export declare enum TransactionType {
    CHARGE = "charge",
    REFUND = "refund",
    DISBURSEMENT = "disbursement"
}
export declare enum WebhookEventType {
    CHARGE_SUCCEEDED = "charge.succeeded",
    CHARGE_FAILED = "charge.failed",
    CHARGE_PENDING = "charge.pending",
    REFUND_SUCCEEDED = "refund.succeeded",
    REFUND_FAILED = "refund.failed",
    DISBURSEMENT_SUCCEEDED = "disbursement.succeeded",
    DISBURSEMENT_FAILED = "disbursement.failed"
}
export declare enum GatewayMode {
    SANDBOX = "sandbox",
    MOCK = "mock",
    DISABLED = "disabled"
}
//# sourceMappingURL=index.d.ts.map