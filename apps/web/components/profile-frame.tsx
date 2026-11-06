"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { cn } from "cn";

const TABS = [
  { href: "/profile", label: "General" },
  { href: "/profile/password", label: "Password" },
] as const;

export function ProfileFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-svh bg-muted/30">
      <AppHeader />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 md:px-0">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information.</p>
        </div>
        <nav
          aria-label="Profile sections"
          className="flex rounded-lg bg-muted p-1"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center rounded-md text-sm",
                  active
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </main>
    </div>
  );
}
