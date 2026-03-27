"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createCharge, clearChargeResult, clearError } from "@/store/slices/payment-slice";
import { getScenariosByProvider } from "@/data/simulator-catalog";
import type { TestScenario } from "@pay-gate-simulator/shared";
import { PaymentProvider } from "@pay-gate-simulator/shared";
import {
  CreditCard,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { StripeLogo, PaypalLogo } from "@/components/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function SimulatorPage() {
  const dispatch = useAppDispatch();
  const { chargeResult, loading: paymentLoading, error: paymentError } = useAppSelector((s) => s.payment);

  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  useEffect(() => {
    dispatch(clearChargeResult());
    dispatch(clearError());
  }, [dispatch]);

  const resetWizard = () => {
    setStep(1);
    setSelectedProvider(null);
    setSelectedScenario(null);
    setPaymentDone(false);
    dispatch(clearChargeResult());
    dispatch(clearError());
  };

  const goBack = () => {
    if (step === 2) {
      setSelectedProvider(null);
      setStep(1);
    } else if (step === 3) {
      setSelectedScenario(null);
      setStep(2);
    }
  };

  const handleSelectProvider = (provider: PaymentProvider) => {
    setSelectedProvider(provider);
    setStep(2);
  };

  const handleSelectScenario = (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    dispatch(clearChargeResult());
    dispatch(clearError());
    setStep(3);
  };

  const handlePay = async () => {
    if (!selectedProvider || !selectedScenario) return;

    const metadata: Record<string, string> = {
      scenarioId: selectedScenario.id,
      scenarioName: selectedScenario.name,
      expectedStatus: selectedScenario.expectedStatus,
    };

    if (selectedScenario.paypalMockCode) {
      metadata.paypalMockCode = selectedScenario.paypalMockCode;
    }

    try {
      const result = await dispatch(
        createCharge({
          provider: selectedProvider,
          amount: selectedScenario.amount,
          currency: selectedScenario.currency,
          testPaymentMethod: selectedScenario.testPaymentMethod,
          description: `Test: ${selectedScenario.name}`,
          metadata,
        }),
      ).unwrap();

      // PayPal create-phase failure: no redirect, show result inline
      if (selectedProvider === PaymentProvider.PAYPAL && result?.status === "failed") {
        setPaymentDone(true);
        setStep(4);
        toast.error("Payment failed (as expected for this test scenario)");
        return;
      }

      // PayPal: redirect to sandbox approval page
      if (selectedProvider === PaymentProvider.PAYPAL && result?.redirectUrl) {
        toast.info("Redirecting to PayPal sandbox for buyer approval...");
        window.location.href = result.redirectUrl;
        return;
      }

      setPaymentDone(true);
      setStep(4);
      const status = result?.status;
      if (status === "succeeded") {
        toast.success("Payment succeeded");
      } else if (status === "failed") {
        toast.error("Payment failed (as expected for this test scenario)");
      } else {
        toast.info(`Payment status: ${status}`);
      }
    } catch {
      setPaymentDone(true);
      setStep(4);
      toast.error("Payment request failed");
    }
  };

  const stepLabels = ["Gateway", "Scenario", "Checkout", "Result"];
  const scenarios = selectedProvider ? getScenariosByProvider(selectedProvider) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Simulator</h1>
          <p className="text-sm text-muted-foreground">
            Test real sandbox payments with Stripe test cards and PayPal sandbox.
          </p>
        </div>
        {step > 1 && step < 4 && (
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div className={cn("h-px w-6", isCompleted ? "bg-primary" : "bg-border")} />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNum}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive && "text-foreground",
                    !isActive && "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Gateway Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select Payment Gateway</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleSelectProvider(PaymentProvider.STRIPE)}
              className="group rounded-lg border border-border bg-card p-6 text-left transition-all hover:border-violet-500 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-md bg-violet-500/10 p-3">
                  <StripeLogo className="h-5 w-auto" />
                </div>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
                  Test Mode
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">Stripe</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Uses real Stripe API in test mode with test PaymentMethod tokens. No real charges.
              </p>
            </button>

            <button
              onClick={() => handleSelectProvider(PaymentProvider.PAYPAL)}
              className="group rounded-lg border border-border bg-card p-6 text-left transition-all hover:border-blue-500 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-md bg-blue-500/10 p-3">
                  <PaypalLogo className="h-5 w-auto" />
                </div>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                  Sandbox
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">PayPal</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Uses PayPal Sandbox API. Creates real orders against sandbox environment.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Test Scenario Selection */}
      {step === 2 && selectedProvider && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select Test Scenario</h2>
          <p className="text-sm text-muted-foreground">
            Using{" "}
            <span className="font-medium text-foreground capitalize">{selectedProvider}</span>
            {selectedProvider === PaymentProvider.STRIPE && " test mode"}
            {selectedProvider === PaymentProvider.PAYPAL && " sandbox"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {scenarios.map((scenario) => {
              const isSuccess = scenario.expectedStatus === "succeeded";
              const isFail = scenario.expectedStatus === "failed";
              return (
                <button
                  key={scenario.id}
                  onClick={() => handleSelectScenario(scenario)}
                  className="group rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">{scenario.name}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        isSuccess && "bg-green-500/10 text-green-500",
                        isFail && "bg-red-500/10 text-red-500",
                        !isSuccess && !isFail && "bg-yellow-500/10 text-yellow-500",
                      )}
                    >
                      {scenario.expectedStatus}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{scenario.description}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{scenario.testPaymentMethod || scenario.paypalMockCode || "sandbox"}</span>
                    <span className="font-semibold">${scenario.amount.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Checkout Summary */}
      {step === 3 && selectedProvider && selectedScenario && (
        <div className="mx-auto max-w-lg space-y-6">
          <h2 className="text-lg font-semibold">Checkout Summary</h2>

          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gateway</span>
              <span className="flex items-center gap-2 font-medium capitalize">
                {selectedProvider === "stripe" && <StripeLogo className="h-4 w-auto" />}
                {selectedProvider === "paypal" && <PaypalLogo className="h-4 w-auto" />}
                {selectedProvider}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mode</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {selectedProvider === PaymentProvider.STRIPE ? "Test Mode" : "Sandbox"}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Scenario</span>
              <span className="font-medium">{selectedScenario.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Description</span>
              <span className="text-right text-xs">{selectedScenario.description}</span>
            </div>
            {selectedScenario.testPaymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Test Token</span>
                <span className="font-mono text-xs">{selectedScenario.testPaymentMethod}</span>
              </div>
            )}
            {selectedScenario.paypalMockCode && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mock Code</span>
                <span className="font-mono text-xs text-red-500">{selectedScenario.paypalMockCode}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected Result</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                selectedScenario.expectedStatus === "succeeded" && "bg-green-500/10 text-green-500",
                selectedScenario.expectedStatus === "failed" && "bg-red-500/10 text-red-500",
                selectedScenario.expectedStatus !== "succeeded" && selectedScenario.expectedStatus !== "failed" && "bg-yellow-500/10 text-yellow-500",
              )}>
                {selectedScenario.expectedStatus}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">
                ${selectedScenario.amount.toFixed(2)} {selectedScenario.currency}
              </span>
            </div>
          </div>

          {selectedProvider === PaymentProvider.PAYPAL && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {selectedScenario.paypalMockCode
                  ? `Uses PayPal negative testing (mock code: ${selectedScenario.paypalMockCode}). `
                    + (["INTERNAL_SERVER_ERROR", "PERMISSION_DENIED"].includes(selectedScenario.paypalMockCode)
                      ? "This error triggers at order creation - no redirect needed."
                      : "Order will be created normally. After approval, capture will fail with the simulated error.")
                  : "PayPal creates an order that requires buyer approval. After creating the order, you will get a redirect URL to approve it in the PayPal sandbox."}
              </p>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paymentLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {paymentLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Execute Test Payment (${selectedScenario.amount.toFixed(2)})
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 4: Payment Result */}
      {step === 4 && paymentDone && (
        <div className="mx-auto max-w-lg space-y-6 text-center">
          {chargeResult && !paymentError ? (
            <>
              {(() => {
                const status = (chargeResult as Record<string, unknown>).status as string;
                const isSuccess = status === "succeeded";
                const matchesExpected = status === selectedScenario?.expectedStatus;
                return (
                  <>
                    <div className="flex justify-center">
                      {isSuccess ? (
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                      ) : (
                        <XCircle className="h-16 w-16 text-red-500" />
                      )}
                    </div>
                    <h2 className="text-xl font-bold">
                      {isSuccess ? "Payment Successful" : `Payment ${status}`}
                    </h2>
                    {matchesExpected && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Result matches expected outcome ({selectedScenario?.expectedStatus})
                      </p>
                    )}
                    {!matchesExpected && selectedScenario && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Expected: {selectedScenario.expectedStatus}, Got: {status}
                      </p>
                    )}
                  </>
                );
              })()}
              <div className="rounded-lg border border-border bg-card p-6 space-y-3 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs">{(chargeResult as Record<string, unknown>).chargeId as string}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {(() => {
                    const status = (chargeResult as Record<string, unknown>).status as string;
                    return (
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        status === "succeeded" ? "bg-green-500/10 text-green-500" :
                        status === "failed" ? "bg-red-500/10 text-red-500" :
                        "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {status}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    ${selectedScenario?.amount.toFixed(2)} {selectedScenario?.currency}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="flex items-center gap-2">
                    {selectedProvider === "stripe" && <StripeLogo className="h-4 w-auto" />}
                    {selectedProvider === "paypal" && <PaypalLogo className="h-4 w-auto" />}
                    <span className="capitalize">{selectedProvider}</span>
                  </span>
                </div>
                {Boolean((chargeResult as Record<string, unknown>).redirectUrl) && (
                  <>
                    <div className="h-px bg-border" />
                    <div>
                      <span className="text-muted-foreground text-xs">PayPal Approval URL:</span>
                      <a
                        href={(chargeResult as Record<string, unknown>).redirectUrl as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs text-primary underline break-all"
                      >
                        {(chargeResult as Record<string, unknown>).redirectUrl as string}
                      </a>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <h2 className="text-xl font-bold">Payment Failed</h2>
              <p className="text-sm text-muted-foreground">{paymentError || "The payment was not completed."}</p>
              {selectedScenario?.expectedStatus === "failed" && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  This failure was expected for this test scenario.
                </p>
              )}
            </>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/transactions"
              className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              View Transactions
            </Link>
            <button
              onClick={resetWizard}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              New Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
