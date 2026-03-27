"use client";

import { Suspense } from "react";
import { XCircle, Loader2 } from "lucide-react";
import { PaypalLogo } from "@/components/icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function CancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("token");

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-12 text-center">
      <XCircle className="mx-auto h-16 w-16 text-yellow-500" />
      <h2 className="text-xl font-bold">Payment Cancelled</h2>
      <p className="text-sm text-muted-foreground">
        You cancelled the PayPal checkout. No payment was captured.
      </p>

      {orderId && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono text-xs">{orderId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Provider</span>
            <span className="flex items-center gap-2">
              <PaypalLogo className="h-4 w-auto" />
              PayPal
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
              Cancelled
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-4">
        <Link
          href="/simulator"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </Link>
        <Link
          href="/transactions"
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          View Transactions
        </Link>
      </div>
    </div>
  );
}

export default function PaypalCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
