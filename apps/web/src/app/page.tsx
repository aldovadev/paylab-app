"use client";

import Link from "next/link";
import Image from "next/image";
import { Particles } from "@/components/ui/particles";
import { AuroraText } from "@/components/ui/aurora-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { MagicCard } from "@/components/ui/magic-card";
import { Zap, Webhook, BarChart3 } from "lucide-react";

const authEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

const features = [
  {
    icon: Zap,
    title: "20+ Test Scenarios",
    description: "Pre-built Stripe and PayPal test scenarios including success, failure, disputes, and edge cases.",
  },
  {
    icon: Webhook,
    title: "Real-time Webhooks",
    description: "Live SSE webhook event stream with payload inspection and delivery status tracking.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Transaction metrics, success rates, latency charts, and provider comparison analytics.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <Particles
        className="absolute inset-0"
        quantity={80}
        ease={80}
        color="#06b6d4"
        refresh
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        <Image src="/logos/paylab.svg" alt="PayLab" width={64} height={64} priority />

        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          <AuroraText colors={["#06b6d4", "#0891b2", "#22d3ee", "#67e8f9"]}>
            PayLab
          </AuroraText>
        </h1>

        <p className="max-w-lg text-lg text-muted-foreground">
          Multi-gateway payment simulator for Stripe and PayPal.
          Test scenarios, inspect webhooks, and analyze metrics — all in one dashboard.
        </p>

        <Link href={authEnabled ? "/login" : "/simulator"}>
          <ShimmerButton
            shimmerColor="#06b6d4"
            background="rgba(6, 182, 212, 0.15)"
            className="px-8 py-3 text-base font-semibold"
          >
            {authEnabled ? "Sign In" : "Open Dashboard"}
          </ShimmerButton>
        </Link>
      </div>

      <section className="relative z-10 mx-auto mt-24 grid max-w-5xl gap-6 px-4 pb-16 sm:grid-cols-3">
        {features.map((feature) => (
          <MagicCard
            key={feature.title}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6"
            gradientColor="#06b6d4"
            gradientOpacity={0.15}
          >
            <feature.icon className="h-8 w-8 text-cyan-500" />
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </MagicCard>
        ))}
      </section>
    </div>
  );
}
