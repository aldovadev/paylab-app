import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "@/lib/api-client";
import type { ApiCallLog, FlowSummary, WebhookEvent } from "@paylab/shared";

export interface Transaction {
  id: string;
  provider: string;
  transactionType: string;
  status: string;
  externalId: string;
  amount: number;
  currency: string;
  createdAt: string;
  rawRequest?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

interface ProviderMetrics {
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
  totalVolume: number;
  successRate: number;
}

interface PaymentState {
  transactions: Transaction[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  chargeResult: Record<string, unknown> | null;
  metrics: Record<string, ProviderMetrics>;
  metricsLoading: boolean;
  flowSummary: FlowSummary | null;
  flowLoading: boolean;
}

const initialState: PaymentState = {
  transactions: [],
  totalCount: 0,
  loading: false,
  error: null,
  chargeResult: null,
  metrics: {},
  metricsLoading: false,
  flowSummary: null,
  flowLoading: false,
};

export const fetchTransactions = createAsyncThunk(
  "payment/fetchTransactions",
  async (params: { page?: number; limit?: number; provider?: string; status?: string }) => {
    const res = await apiClient.get("/payments/transactions", { params });
    return res.data.details.reply;
  },
);

export const fetchMetrics = createAsyncThunk(
  "payment/fetchMetrics",
  async (provider?: string) => {
    const res = await apiClient.get("/payments/metrics", { params: provider ? { provider } : {} });
    return res.data.details.reply;
  },
);

export const createCharge = createAsyncThunk(
  "payment/createCharge",
  async (payload: {
    provider: string;
    amount: number;
    currency: string;
    paymentMethod?: string;
    testPaymentMethod?: string;
    description?: string;
    metadata?: Record<string, string>;
  }) => {
    const res = await apiClient.post("/payments/charge", payload);
    return res.data.details.reply;
  },
);

export const capturePaypalOrder = createAsyncThunk(
  "payment/capturePaypal",
  async (orderId: string) => {
    const res = await apiClient.post(`/payments/capture/paypal/${orderId}`);
    return res.data.details.reply;
  },
);

export const createRefund = createAsyncThunk(
  "payment/createRefund",
  async (payload: { chargeId: string; provider: string; amount?: number; reason?: string }) => {
    const res = await apiClient.post("/payments/refund", payload);
    return res.data.details.reply;
  },
);

export const fetchFlowSummary = createAsyncThunk(
  "payment/fetchFlowSummary",
  async (externalId: string) => {
    const res = await apiClient.get(`/payments/flow/${externalId}`);
    return res.data.details.reply as FlowSummary;
  },
);

export const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    clearChargeResult(state) {
      state.chargeResult = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearFlowSummary(state) {
      state.flowSummary = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload?.items ?? [];
        state.totalCount = action.payload?.pagination?.totalData ?? 0;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch transactions";
      })
      .addCase(fetchMetrics.pending, (state) => {
        state.metricsLoading = true;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metricsLoading = false;
        state.metrics = action.payload ?? {};
      })
      .addCase(fetchMetrics.rejected, (state) => {
        state.metricsLoading = false;
      })
      .addCase(createCharge.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCharge.fulfilled, (state, action) => {
        state.loading = false;
        state.chargeResult = action.payload;
      })
      .addCase(createCharge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create charge";
      })
      .addCase(capturePaypalOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(capturePaypalOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.chargeResult = action.payload;
      })
      .addCase(capturePaypalOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to capture PayPal order";
      })
      .addCase(createRefund.pending, (state) => {
        state.loading = true;
      })
      .addCase(createRefund.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create refund";
      })
      .addCase(fetchFlowSummary.pending, (state) => {
        state.flowLoading = true;
        state.flowSummary = null;
      })
      .addCase(fetchFlowSummary.fulfilled, (state, action) => {
        state.flowLoading = false;
        state.flowSummary = action.payload;
      })
      .addCase(fetchFlowSummary.rejected, (state, action) => {
        state.flowLoading = false;
        state.error = action.error.message || "Failed to fetch flow summary";
      });
  },
});

export const { clearChargeResult, clearError, clearFlowSummary } = paymentSlice.actions;
