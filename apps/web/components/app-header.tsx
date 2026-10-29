"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { ProfileMenu } from "@/components/profile-menu";

export function AppHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 md:px-8">
      <Link href="/projects" className="flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Check className="size-4" />
        </span>
        Trackbit
      </Link>
      <ProfileMenu />
    </header>
  );
}
