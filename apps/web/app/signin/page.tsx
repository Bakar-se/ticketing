import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/login-form";
import { ResetNotice } from "@/components/reset-notice";

export default function Page() {
  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <ResetNotice />
        </Suspense>
        <LoginForm />
      </div>
    </AuthLayout>
  );
}
