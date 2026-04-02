"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTransactions } from "@/store/slices/payment-slice";
import { format } from "date-fns";
import { AuroraText } from "@/components/ui/aurora-text";
import { Eye } from "lucide-react";

export default function TransactionsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { transactions, totalCount, loading } = useAppSelector((s) => s.payment);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 15;

  useEffect(() => {
    dispatch(
      fetchTransactions({
        page,
        limit,
        provider: providerFilter || undefined,
        status: statusFilter || undefined,
      }),
    );
  }, [dispatch, page, providerFilter, statusFilter]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        <AuroraText colors={["#06b6d4", "#0891b2", "#22d3ee", "#67e8f9"]}>Transactions</AuroraText>
      </h1>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Providers</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Provider</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">External ID</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Flow</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && (!transactions || transactions.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            )}
            {(transactions ?? []).map((tx) => (
              <Fragment key={tx.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                  className="cursor-pointer border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">{tx.provider}</td>
                  <td className="px-4 py-3">{tx.transactionType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tx.status === "succeeded"
                          ? "bg-green-500/10 text-green-500"
                          : tx.status === "failed"
                            ? "bg-red-500/10 text-red-500"
                            : tx.status === "pending" || tx.status === "processing"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {tx.amount} {tx.currency}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.externalId}</td>
                  <td className="px-4 py-3">{format(new Date(tx.createdAt), "MMM d, HH:mm:ss")}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/transactions/${tx.externalId}`);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-input transition-colors hover:bg-muted"
                      title="View API flow"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
                {expandedId === tx.id && (
                  <tr key={`${tx.id}-detail`}>
                    <td colSpan={7} className="bg-muted/20 px-4 py-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Raw Request</p>
                          <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(tx.rawRequest, null, 2) || "N/A"}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Raw Response</p>
                          <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(tx.rawResponse, null, 2) || "N/A"}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
