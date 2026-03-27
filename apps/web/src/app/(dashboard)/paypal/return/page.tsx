"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { capturePaypalOrder } from "@/store/slices/payment-slice";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { PaypalLogo } from "@/components/icons";
import Link from "next/link";

type CaptureState = "loading" | "success" | "error";

function ReturnContent() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { chargeResult } = useAppSelector((s) => s.payment);
  const [state, setState] = useState<CaptureState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const capturedRef = useRef(false);

  const orderId = searchParams.get("token");

  useEffect(() => {
    if (!orderId || capturedRef.current) return;
    capturedRef.current = true;

    dispatch(capturePaypalOrder(orderId))
      .unwrap()
      .then(() => setState("success"))
      .catch((err) => {
        setState("error");
        setErrorMsg(typeof err === "string" ? err : err?.message || "Capture failed");
      });
  }, [orderId, dispatch]);

  if (!orderId) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pt-12 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500" />
        <h2 className="text-xl font-bold">Missing Order ID</h2>
        <p className="text-sm text-muted-foreground">
          No PayPal order token found in the URL. This page is reached after PayPal buyer approval.
        </p>
        <Link
          href="/simulator"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Simulator
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-12 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-500" />
          <h2 className="text-xl font-bold">Capturing PayPal Order</h2>
          <p className="text-sm text-muted-foreground">
            Finalizing your payment with PayPal...
          </p>
          <p className="font-mono text-xs text-muted-foreground">Order: {orderId}</p>
        </>
      )}

      {state === "success" && (
        <>
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="text-xl font-bold">Payment Captured</h2>
          <p className="text-sm text-green-600 dark:text-green-400">
            PayPal order has been successfully captured.
          </p>

          <div className="rounded-lg border border-border bg-card p-6 space-y-3 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs">{orderId}</span>
            </div>
            {chargeResult && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                    {(chargeResult as Record<string, unknown>).status as string}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    ${((chargeResult as Record<string, unknown>).amount as number)?.toFixed(2)}{" "}
                    {(chargeResult as Record<string, unknown>).currency as string}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="flex items-center gap-2">
                    <PaypalLogo className="h-4 w-auto" />
                    PayPal
                  </span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {state === "error" && (
        <>
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="text-xl font-bold">Capture Failed</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <p className="font-mono text-xs text-muted-foreground">Order: {orderId}</p>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-4">
        <Link
          href="/transactions"
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          View Transactions
        </Link>
        <Link
          href="/webhooks"
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          View Webhooks
        </Link>
        <Link
          href="/simulator"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Test
        </Link>
      </div>
    </div>
  );
}

export default function PaypalReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
