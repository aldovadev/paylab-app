export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL_BALANCE = 'paypal_balance',
  WALLET = 'wallet',
}

export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
}

export enum WebhookEventType {
  CHARGE_SUCCEEDED = 'charge.succeeded',
  CHARGE_FAILED = 'charge.failed',
  CHARGE_PENDING = 'charge.pending',
  REFUND_SUCCEEDED = 'refund.succeeded',
  REFUND_FAILED = 'refund.failed',
}

export enum CallDirection {
  OUTBOUND = 'outbound',
  INBOUND_WEBHOOK = 'inbound_webhook',
}
