"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const authEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3100/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!authEnabled) {
      setChecked(true);
      return;
    }

    const token = localStorage.getItem("paylab_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Validate token with the API
    fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem("paylab_token");
          router.replace("/login");
        } else {
          setChecked(true);
        }
      })
      .catch(() => {
        localStorage.removeItem("paylab_token");
        router.replace("/login");
      });
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
