// apps/web/components/reset-password-form.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});
type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  // Better Auth redirects here with ?error=... when the token is bad or expired
  const [invalid, setInvalid] = useState(!token || !!params.get("error"));
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token: token!,
    });
    if (error) {
      if (error.code?.toUpperCase().includes("INVALID_TOKEN")) setInvalid(true);
      else setServerError("Something went wrong. Please try again.");
      return;
    }
    router.push("/signin?reset=success");
  }

  if (invalid) {
    return (
      <div className="flex flex-col gap-6">
        <span className="flex size-10 items-center justify-center rounded-full border bg-muted/50">
          <CircleAlert className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            This link is invalid or has expired
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Reset links work once and expire after an hour. Request a new one to
            continue.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className={buttonVariants({ className: "h-10" })}
        >
          Request a new link
        </Link>
        <p className="text-center text-sm">
          <Link href="/signin" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter a new password for your account.
        </p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className="h-10"
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="h-10">
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
