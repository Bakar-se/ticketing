"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  value: z.string().trim().min(1, "Required").max(200, "Too long"),
});
type Values = z.infer<typeof schema>;

export function CreateForm({
  placeholder,
  submitLabel,
  onSubmit,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  return (
    <form
      onSubmit={handleSubmit(async ({ value }) => {
        setServerError("");
        try {
          await onSubmit(value);
          reset();
        } catch (e) {
          setServerError(
            e instanceof Error ? e.message : "Something went wrong",
          );
        }
      })}
      className="flex flex-col gap-1"
    >
      <div className="flex gap-2">
        <Input placeholder={placeholder} {...register("value")} />
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
      {errors.value && (
        <p className="text-sm text-destructive">{errors.value.message}</p>
      )}
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
    </form>
  );
}
