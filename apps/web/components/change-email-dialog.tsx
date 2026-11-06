"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

// Remembers the address being changed to, so /profile can tell which of the
// two links just brought the person back. Per-browser only; there's a
// general message when it's missing (for example, approved on a phone).
const PENDING_KEY = "trackbit.pendingEmail";

export function readPendingEmail(): string | null {
  try {
    return window.localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingEmail() {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

function rememberPendingEmail(email: string) {
  try {
    window.localStorage.setItem(PENDING_KEY, email);
  } catch {
    // storage unavailable: the landing page falls back to a general message
  }
}

export function ChangeEmailDialog({
  currentEmail,
  open,
  onOpenChange,
}: {
  currentEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>
            {`We'll ask ${currentEmail} to approve the change first, then send a confirmation link to the new address.`}
          </DialogDescription>
        </DialogHeader>
        {/* Remounted on each opening so it starts empty */}
        {open && (
          <ChangeEmailForm currentEmail={currentEmail} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangeEmailForm({
  currentEmail,
  onDone,
}: {
  currentEmail: string;
  onDone: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const schema = z.object({
    newEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email")
      .refine((email) => email !== currentEmail.toLowerCase(), "That's already your email"),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { newEmail: "" },
  });

  async function onSubmit({ newEmail }: z.output<typeof schema>) {
    setServerError("");
    const result = await authClient.changeEmail({
      newEmail,
      callbackURL: `${window.location.origin}/profile?emailChange=1`,
    });
    if (result.error) {
      setServerError("Couldn't start the change. Try again in a moment.");
      return;
    }
    // The auth service answers the same way when the address is taken,
    // so this message never reveals whether someone else has it
    rememberPendingEmail(newEmail);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm">
          {`We've emailed ${currentEmail}. Approve the change there, then confirm the new address.`}
        </p>
        <div className="flex justify-end">
          <Button type="button" className="h-10" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="change-email-new">New email</Label>
        <Input
          id="change-email-new"
          type="email"
          autoComplete="email"
          className="h-10"
          aria-invalid={!!errors.newEmail}
          aria-describedby={errors.newEmail ? "change-email-new-error" : undefined}
          {...register("newEmail")}
        />
        {errors.newEmail && (
          <p id="change-email-new-error" className="text-sm text-destructive">
            {errors.newEmail.message}
          </p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send approval link"}
        </Button>
      </div>
    </form>
  );
}
