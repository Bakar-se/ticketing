// apps/web/components/auth/auth-layout.tsx
import Link from "next/link";
import { Check } from "lucide-react";
import { AuthArt } from "@/components/auth/auth-art";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left half: logo on top, form centered */}
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Check className="size-4" />
          </span>
          Trackbit
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Right half: hidden below lg, so phones get the form only */}
      <div className="hidden flex-col items-center justify-center gap-10 bg-primary p-12 text-primary-foreground lg:flex">
        <AuthArt className="w-full max-w-lg" />
        <p className="max-w-sm text-center text-lg font-medium">
          Plan, track and ship work in one place.
        </p>
      </div>
    </div>
  );
}
