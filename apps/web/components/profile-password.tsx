"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PasswordInput } from "@/components/password-input";
import { ProfileFrame } from "@/components/profile-frame";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

// Better Auth's default minimum; the auth service refuses anything shorter
const MIN_PASSWORD = 8;

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  // Only once it's long enough, so a short password gets the length message alone
  .refine((d) => d.newPassword.length < MIN_PASSWORD || d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one",
  });
type PasswordValues = z.infer<typeof schema>;

const EMPTY: PasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ProfilePassword() {
  return (
    <ProfileFrame>
      <PasswordCard />
    </ProfileFrame>
  );
}

function PasswordCard() {
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [updated, setUpdated] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  async function onSubmit(values: PasswordValues) {
    setServerError("");
    setUpdated(false);
    const result = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: signOutOthers,
    });
    if (result.error) {
      if (result.error.code === "INVALID_PASSWORD") {
        setError("currentPassword", { message: "Current password is incorrect." });
      } else {
        setServerError("Couldn't update your password.");
      }
      return;
    }
    reset(EMPTY);
    setUpdated(true);
  }

  const clearUpdatedOnChange = { onChange: () => setUpdated(false) };

  function fieldProps(name: keyof PasswordValues, help?: string) {
    const error = errors[name];
    return {
      id: `profile-${name}`,
      "aria-invalid": !!error,
      "aria-describedby": error
        ? `profile-${name}-error`
        : help
          ? `profile-${name}-help`
          : undefined,
      ...register(name, clearUpdatedOnChange),
    };
  }

  function fieldMessage(name: keyof PasswordValues, help?: string) {
    const error = errors[name];
    if (error) {
      return (
        <p id={`profile-${name}-error`} className="text-sm text-destructive">
          {error.message}
        </p>
      );
    }
    if (!help) return null;
    return (
      <p id={`profile-${name}-help`} className="text-xs text-muted-foreground">
        {help}
      </p>
    );
  }

  const newHelp = `At least ${MIN_PASSWORD} characters.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change the password you use to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-currentPassword">Current password</Label>
            <PasswordInput autoComplete="current-password" {...fieldProps("currentPassword")} />
            {fieldMessage("currentPassword")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-newPassword">New password</Label>
            <PasswordInput autoComplete="new-password" {...fieldProps("newPassword", newHelp)} />
            {fieldMessage("newPassword", newHelp)}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-confirmPassword">Confirm new password</Label>
            <PasswordInput autoComplete="new-password" {...fieldProps("confirmPassword")} />
            {fieldMessage("confirmPassword")}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="profile-sign-out-others"
              checked={signOutOthers}
              onCheckedChange={setSignOutOthers}
            />
            <Label htmlFor="profile-sign-out-others" className="font-normal">
              Sign out of other devices
            </Label>
          </div>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            {/* Stays mounted so screen readers announce the text when it appears */}
            <p role="status" className="text-sm text-muted-foreground">
              {updated ? "Password updated." : ""}
            </p>
            <Button type="submit" className="h-10" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
