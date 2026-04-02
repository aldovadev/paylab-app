"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFlowSummary, clearFlowSummary } from "@/store/slices/payment-slice";
import { sanitizeHeaders, sanitizeObject } from "@/lib/sanitize-headers";
import { format } from "date-fns";
import { AuroraText } from "@/components/ui/aurora-text";
import { MagicCard } from "@/components/ui/magic-card";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import type { ApiCallLog, WebhookEvent } from "@paylab/shared";

type TimelineEntry =
  | { kind: "api"; data: ApiCallLog }
  | { kind: "webhook"; data: WebhookEvent & { id?: string; receivedAt: string } };

function buildTimeline(
  apiCalls: ApiCallLog[],
  webhookEvents: (WebhookEvent & { id?: string; receivedAt: string })[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...apiCalls.map((c) => ({ kind: "api" as const, data: c })),
    ...webhookEvents.map((w) => ({ kind: "webhook" as const, data: w })),
  ];
  entries.sort((a, b) => {
    const dateA = a.kind === "api" ? a.data.createdAt : a.data.receivedAt;
    const dateB = b.kind === "api" ? b.data.createdAt : b.data.receivedAt;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  return entries;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-500",
    POST: "bg-green-500/10 text-green-500",
    PUT: "bg-yellow-500/10 text-yellow-500",
    DELETE: "bg-red-500/10 text-red-500",
    PATCH: "bg-purple-500/10 text-purple-500",
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${colors[method] || "bg-muted text-muted-foreground"}`}>
      {method}
    </span>
  );
}

function StatusCodeBadge({ code }: { code?: number }) {
  if (!code) return <span className="text-xs text-muted-foreground">N/A</span>;
  const color =
    code >= 200 && code < 300
      ? "text-green-500"
      : code >= 400
        ? "text-red-500"
        : "text-yellow-500";
  return <span className={`font-mono text-xs font-semibold ${color}`}>{code}</span>;
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (!data) {
    return (
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">N/A</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <pre className="max-h-60 overflow-auto rounded bg-muted p-2 text-xs leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function ApiCallEntry({ call }: { call: ApiCallLog }) {
  const [expanded, setExpanded] = useState(false);
  const isOutbound = call.direction === "outbound";

  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        {/* Direction icon */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOutbound ? "bg-blue-500/10" : "bg-amber-500/10"}`}>
          {isOutbound
            ? <ArrowUpRight className="h-4 w-4 text-blue-500" />
            : <ArrowDownLeft className="h-4 w-4 text-amber-500" />}
        </div>

        {/* Method + Endpoint */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MethodBadge method={call.method} />
          <span className="truncate font-mono text-xs">{call.endpoint}</span>
        </div>

        {/* Status + Duration */}
        <div className="flex items-center gap-3 text-xs">
          <StatusCodeBadge code={call.responseStatus} />
          {call.durationMs != null && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {call.durationMs}ms
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {format(new Date(call.createdAt), "HH:mm:ss.SSS")}
        </span>

        {/* Expand chevron */}
        {expanded
          ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="ml-11 space-y-3 border-l border-border pb-3 pl-4">
          <div className="grid gap-3 md:grid-cols-2">
            <JsonBlock label="Request Headers" data={sanitizeHeaders(call.requestHeaders)} />
            <JsonBlock label="Request Body" data={sanitizeObject(call.requestBody)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <JsonBlock label="Response Headers" data={sanitizeHeaders(call.responseHeaders)} />
            <JsonBlock label="Response Body" data={sanitizeObject(call.responseBody)} />
          </div>
        </div>
      )}
    </div>
  );
}

function WebhookEntry({ event }: { event: WebhookEvent & { receivedAt: string } }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        {/* Direction icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
          <ArrowDownLeft className="h-4 w-4 text-amber-500" />
        </div>

        {/* Event type */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="inline-flex rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-500">
            WEBHOOK
          </span>
          <span className="truncate font-mono text-xs">{event.eventType}</span>
        </div>

        {/* Verified status */}
        <div className="flex items-center gap-1 text-xs">
          {event.verified
            ? <><Shield className="h-3.5 w-3.5 text-green-500" /><span className="text-green-500">Verified</span></>
            : <><ShieldAlert className="h-3.5 w-3.5 text-yellow-500" /><span className="text-yellow-500">Unverified</span></>}
        </div>

        {/* Timestamp */}
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {format(new Date(event.receivedAt), "HH:mm:ss.SSS")}
        </span>

        {expanded
          ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="ml-11 space-y-3 border-l border-border pb-3 pl-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Event ID:</span> <span className="font-mono">{event.eventId}</span></div>
            <div><span className="text-muted-foreground">Charge ID:</span> <span className="font-mono">{event.chargeId || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Provider:</span> <span>{event.provider}</span></div>
            {event.refundId && <div><span className="text-muted-foreground">Refund ID:</span> <span className="font-mono">{event.refundId}</span></div>}
          </div>
          <JsonBlock label="Payload" data={sanitizeObject(event.payload)} />
        </div>
      )}
    </div>
  );
}

export default function FlowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { flowSummary, flowLoading, error } = useAppSelector((s) => s.payment);

  useEffect(() => {
    if (params.id) {
      dispatch(fetchFlowSummary(params.id));
    }
    return () => {
      dispatch(clearFlowSummary());
    };
  }, [dispatch, params.id]);

  const timeline = flowSummary
    ? buildTimeline(flowSummary.apiCalls, flowSummary.webhookEvents as (WebhookEvent & { id?: string; receivedAt: string })[])
    : [];

  const tx = flowSummary?.transaction;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/transactions")}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-input transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            <AuroraText colors={["#06b6d4", "#0891b2", "#22d3ee", "#67e8f9"]}>API Flow</AuroraText>
          </h1>
          {tx && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{tx.externalId}</p>
          )}
        </div>
      </div>

      {/* Loading */}
      {flowLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !flowLoading && (
        <MagicCard className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        </MagicCard>
      )}

      {/* Content */}
      {flowSummary && !flowLoading && (
        <>
          {/* Transaction summary card */}
          <MagicCard className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Provider</p>
                <p className="mt-1 text-sm font-medium capitalize">{tx?.provider}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Status</p>
                <p className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tx?.status === "succeeded"
                        ? "bg-green-500/10 text-green-500"
                        : tx?.status === "failed"
                          ? "bg-red-500/10 text-red-500"
                          : tx?.status === "pending" || tx?.status === "processing"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {tx?.status === "succeeded" && <CheckCircle2 className="h-3 w-3" />}
                    {tx?.status === "failed" && <XCircle className="h-3 w-3" />}
                    {tx?.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Amount</p>
                <p className="mt-1 font-mono text-sm font-medium">
                  {tx?.amount} {tx?.currency}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Created</p>
                <p className="mt-1 text-sm">
                  {tx?.createdAt && format(new Date(tx.createdAt), "MMM d yyyy, HH:mm:ss")}
                </p>
              </div>
            </div>
            {tx?.description && (
              <p className="mt-3 text-xs text-muted-foreground">{tx.description}</p>
            )}
          </MagicCard>

          {/* Related transactions (refunds) */}
          {flowSummary.relatedTransactions.length > 0 && (
            <MagicCard className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Related Transactions</h2>
              <div className="space-y-2">
                {flowSummary.relatedTransactions.map((rtx) => (
                  <div key={rtx.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-500">
                        {rtx.transactionType}
                      </span>
                      <span className="font-mono">{rtx.externalId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${rtx.status === "refunded"
                            ? "bg-purple-500/10 text-purple-500"
                            : rtx.status === "succeeded"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {rtx.status}
                      </span>
                      <span className="font-mono">{rtx.amount} {rtx.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </MagicCard>
          )}

          {/* Timeline */}
          <MagicCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                API Call Timeline
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({flowSummary.apiCalls.length} calls, {flowSummary.webhookEvents.length} webhooks)
                </span>
              </h2>
            </div>

            {timeline.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No API calls or webhooks recorded for this transaction.
              </p>
            )}

            <div className="divide-y divide-border">
              {timeline.map((entry, i) =>
                entry.kind === "api" ? (
                  <ApiCallEntry key={`api-${entry.data.id}-${i}`} call={entry.data} />
                ) : (
                  <WebhookEntry key={`wh-${entry.data.eventId}-${i}`} event={entry.data} />
                ),
              )}
            </div>
          </MagicCard>
        </>
      )}
    </div>
  );
}
