"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMetrics } from "@/store/slices/payment-slice";
import { cn } from "@/lib/utils";

export default function MetricsPage() {
  const dispatch = useAppDispatch();
  const { metrics, metricsLoading } = useAppSelector((s) => s.payment);

  useEffect(() => {
    dispatch(fetchMetrics());
  }, [dispatch]);

  const providers = Object.keys(metrics);

  const totals = providers.reduce(
    (acc, key) => {
      const m = metrics[key];
      acc.total += m.total;
      acc.succeeded += m.succeeded;
      acc.failed += m.failed;
      acc.pending += m.pending;
      acc.totalVolume += m.totalVolume;
      return acc;
    },
    { total: 0, succeeded: 0, failed: 0, pending: 0, totalVolume: 0 },
  );
  const overallSuccessRate = totals.total > 0 ? ((totals.succeeded / totals.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Success and failure rates across all payment gateways.
          </p>
        </div>
        <button
          onClick={() => dispatch(fetchMetrics())}
          disabled={metricsLoading}
          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          {metricsLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Overall summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard label="Total Transactions" value={totals.total.toString()} />
        <SummaryCard
          label="Success Rate"
          value={`${overallSuccessRate}%`}
          valueClass={Number(overallSuccessRate) >= 80 ? "text-green-500" : Number(overallSuccessRate) >= 50 ? "text-yellow-500" : "text-red-500"}
        />
        <SummaryCard label="Failed" value={totals.failed.toString()} valueClass="text-red-500" />
        <SummaryCard label="Total Volume" value={`$${totals.totalVolume.toFixed(2)}`} />
      </div>

      {/* Per-provider breakdown */}
      {metricsLoading && providers.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Loading metrics...</p>
      )}
      {!metricsLoading && providers.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No transaction data yet. Run some test scenarios first.
        </p>
      )}

      {providers.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {providers.map((provider) => {
            const m = metrics[provider];
            return (
              <div
                key={provider}
                className="rounded-lg border border-border bg-card p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold capitalize">{provider}</h3>
                  <span className="text-sm font-medium text-muted-foreground">
                    {m.total} txns
                  </span>
                </div>

                {/* Success rate bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{m.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        m.successRate >= 80 ? "bg-green-500" : m.successRate >= 50 ? "bg-yellow-500" : "bg-red-500",
                      )}
                      style={{ width: `${Math.min(m.successRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-green-500/5 p-3">
                    <p className="text-xs text-muted-foreground">Succeeded</p>
                    <p className="text-lg font-bold text-green-500">{m.succeeded}</p>
                  </div>
                  <div className="rounded-md bg-red-500/5 p-3">
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="text-lg font-bold text-red-500">{m.failed}</p>
                  </div>
                  <div className="rounded-md bg-yellow-500/5 p-3">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold text-yellow-500">{m.pending}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="text-lg font-bold">${m.totalVolume.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", valueClass)}>{value}</p>
    </div>
  );
}
