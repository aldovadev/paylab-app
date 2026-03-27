"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  ArrowLeftRight,
  Webhook,
  BarChart3,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/simulator", label: "Simulator", icon: Play },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <CreditCard className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">PayGate Sim</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        Pay Gate Simulator v0.1.0
      </div>
    </aside>
  );
}
