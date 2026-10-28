// apps/web/components/forgot-password-form.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      // Absolute URL: Better Auth checks it against trustedOrigins (WEB_ORIGIN is already there)
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setServerError("Something went wrong. Please try again.");
      return;
    }
    setSent(true); // same screen whether or not the account exists
  }

  const backLink = (
    <p className="text-center text-sm">
      <Link href="/signin" className="underline underline-offset-4">
        Back to sign in
      </Link>
    </p>
  );

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <span className="flex size-10 items-center justify-center rounded-full border bg-muted/50">
          <Mail className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If an account exists for that email, we&apos;ve sent a link to reset
            your password. The link expires in 1 hour.
          </p>
        </div>
        {backLink}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className="h-10"
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="h-10">
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      {backLink}
    </div>
  );
}
