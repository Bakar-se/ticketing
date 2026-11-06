"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/return-path";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || /^\+?[0-9 ()-]{7,20}$/.test(v),
        "Enter a valid phone number",
      ),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
type Values = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: Values) {
    setServerError("");
    const result = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      phone: values.phone || undefined, // empty phone is simply not sent
      // Sign-up emails a verification link; it lands back on the profile
      callbackURL: `${window.location.origin}/profile?verified=1`,
    });
    if (result.error)
      setServerError(result.error.message ?? "Something went wrong");
    else router.push(next ?? "/projects"); // Better Auth signs the new user in automatically
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-1 text-left">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Enter your details to get started
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="name"
          aria-invalid={!!errors.name}
          className="h-10"
          autoComplete="name"
          {...register("name")}
          placeholder="Your name"
        />
        {errors.name && (
          <p role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="email"
          type="email"
          aria-invalid={!!errors.email}
          className="h-10"
          autoComplete="email"
          {...register("email")}
          placeholder="your@company.com"
        />
        {errors.email && (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-phone">Phone (optional)</Label>
        <Input
          id="phone"
          aria-invalid={!!errors.phone}
          className="h-10"
          type="tel"
          autoComplete="tel"
          {...register("phone")}
          placeholder="Enter your phone number"
        />
        {errors.phone && (
          <p role="alert" className="text-sm text-destructive">
            {errors.phone.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
          placeholder="Enter your password"
        />
        {errors.password && (
          <p role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <PasswordInput
          id="signup-confirm"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
          placeholder="Confirm your password"
        />
        {errors.confirmPassword && (
          <p role="alert" className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        Create account
      </Button>
      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link
          className="underline"
          href={next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
