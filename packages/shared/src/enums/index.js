"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayMode = exports.WebhookEventType = exports.TransactionType = exports.PaymentMethod = exports.PaymentStatus = exports.PaymentProvider = void 0;
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["STRIPE"] = "stripe";
    PaymentProvider["PAYPAL"] = "paypal";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["SUCCEEDED"] = "succeeded";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["CANCELLED"] = "cancelled";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "card";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["PAYPAL_BALANCE"] = "paypal_balance";
    PaymentMethod["WALLET"] = "wallet";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["CHARGE"] = "charge";
    TransactionType["REFUND"] = "refund";
    TransactionType["DISBURSEMENT"] = "disbursement";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var WebhookEventType;
(function (WebhookEventType) {
    WebhookEventType["CHARGE_SUCCEEDED"] = "charge.succeeded";
    WebhookEventType["CHARGE_FAILED"] = "charge.failed";
    WebhookEventType["CHARGE_PENDING"] = "charge.pending";
    WebhookEventType["REFUND_SUCCEEDED"] = "refund.succeeded";
    WebhookEventType["REFUND_FAILED"] = "refund.failed";
    WebhookEventType["DISBURSEMENT_SUCCEEDED"] = "disbursement.succeeded";
    WebhookEventType["DISBURSEMENT_FAILED"] = "disbursement.failed";
})(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
var GatewayMode;
(function (GatewayMode) {
    GatewayMode["SANDBOX"] = "sandbox";
    GatewayMode["MOCK"] = "mock";
    GatewayMode["DISABLED"] = "disabled";
})(GatewayMode || (exports.GatewayMode = GatewayMode = {}));
//# sourceMappingURL=index.js.map