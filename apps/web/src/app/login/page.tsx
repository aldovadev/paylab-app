"use client";

import Image from "next/image";
import { Particles } from "@/components/ui/particles";
import { AuroraText } from "@/components/ui/aurora-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3100/api";

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${apiBase}/auth/google`;
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <Particles className="absolute inset-0" quantity={50} ease={80} color="#06b6d4" refresh />

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        <Image src="/logos/paylab.svg" alt="PayLab" width={56} height={56} priority />

        <h1 className="text-3xl font-bold">
          <AuroraText colors={["#06b6d4", "#0891b2", "#22d3ee", "#67e8f9"]}>
            Sign in to PayLab
          </AuroraText>
        </h1>

        <p className="max-w-sm text-sm text-muted-foreground">
          Authenticate with your Google account to access the payment simulator dashboard.
        </p>

        <ShimmerButton
          shimmerColor="#06b6d4"
          background="rgba(6, 182, 212, 0.15)"
          className="px-6 py-3 text-sm font-semibold"
          onClick={handleGoogleLogin}
        >
          Continue with Google
        </ShimmerButton>
      </div>
    </div>
  );
}
