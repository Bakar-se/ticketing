"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ProfileFrame } from "@/components/profile-frame";
import { initials } from "@/components/profile-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, queryKeys } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const PHONE_MESSAGE = "Enter the number with its country code, like +1 555 000 0000";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name") // same rule as sign-up
    .max(100, "Must be 100 characters or less"),
  // E.164: a + and 8 to 15 digits. Spaces are for reading and are dropped.
  phone: z
    .string()
    .transform((value) => value.replace(/\s+/g, ""))
    .refine((value) => value === "" || /^\+[0-9]{8,15}$/.test(value), PHONE_MESSAGE),
});
type Values = z.input<typeof schema>;
type Saved = z.output<typeof schema>;

type Person = { name: string; email: string; phone?: string | null };

export function ProfileGeneral() {
  const { data, isPending } = authClient.useSession();
  const person = data?.user;
  return (
    <ProfileFrame>
      {/* A session refetch after saving must not unmount the form */}
      {isPending && !person ? (
        <p>Loading…</p>
      ) : person ? (
        <GeneralForm person={person} />
      ) : (
        <p role="alert">Couldn&apos;t load your profile.</p>
      )}
    </ProfileFrame>
  );
}

function GeneralForm({ person }: { person: Person }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Values, unknown, Saved>({
    resolver: zodResolver(schema),
    defaultValues: { name: person.name, phone: person.phone ?? "" },
  });

  async function onSubmit(values: Saved) {
    setServerError("");
    const result = await authClient.updateUser({
      name: values.name,
      phone: values.phone || null, // null clears it; "" would be stored as-is
    });
    if (result.error) {
      setServerError("Couldn't save your profile.");
      return;
    }
    reset(values);
    setSaved(true);
    // The API refreshes this person's member copies on every request
    // (docs/adr/0001), so make one now rather than on their next visit.
    // Best effort: if it fails, their next request does the same job.
    void api
      .get("/projects")
      .then(() => {
        // Names shown on projects, teams, tickets, and comments come from those copies
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
        void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      })
      .catch(() => undefined);
  }

  const clearSavedOnChange = { onChange: () => setSaved(false) };

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold"
          >
            {initials(person.name)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{person.name}</p>
            <p className="truncate text-sm text-muted-foreground">{person.email}</p>
          </div>
        </div>
        <Separator />
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              autoComplete="name"
              className="h-10"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "profile-name-error" : undefined}
              {...register("name", clearSavedOnChange)}
            />
            {errors.name && (
              <p id="profile-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              value={person.email}
              readOnly
              className="h-10 text-muted-foreground"
              aria-describedby="profile-email-help"
            />
            <p id="profile-email-help" className="text-xs text-muted-foreground">
              Contact support to change your email.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 000 0000"
              className="h-10"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "profile-phone-error" : "profile-phone-help"}
              {...register("phone", clearSavedOnChange)}
            />
            {errors.phone ? (
              <p id="profile-phone-error" className="text-sm text-destructive">
                {errors.phone.message}
              </p>
            ) : (
              <p id="profile-phone-help" className="text-xs text-muted-foreground">
                Optional. Include the country code.
              </p>
            )}
          </div>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            {saved && !isDirty && (
              <p role="status" className="text-sm text-muted-foreground">
                Saved
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={!isDirty || isSubmitting}
              onClick={() => {
                reset();
                setServerError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-10" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
