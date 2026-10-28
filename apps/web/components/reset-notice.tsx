// apps/web/components/reset-notice.tsx  (the banner on /signin)
"use client";

import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

export function ResetNotice() {
  const params = useSearchParams();
  if (params.get("reset") !== "success") return null;
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border bg-muted/50 p-3 text-sm"
    >
      <Check className="mt-0.5 size-4 text-green-600" />
      <span>Password updated. Sign in with your new password.</span>
    </div>
  );
}
