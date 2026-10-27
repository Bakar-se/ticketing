"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "Key must be 2 to 5 letters"),
});
type Values = z.infer<typeof schema>;

function suggestKey(name: string) {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2)
    return words
      .map((w) => w[0])
      .join("")
      .slice(0, 5);
  return (words[0] ?? "").slice(0, 3);
}

export function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", key: "" },
  });

  async function onSubmit(values: Values) {
    setServerError("");
    try {
      await api("/projects", { method: "POST", body: JSON.stringify(values) });
      reset();
      onCreated();
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : "Could not create project",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="grid flex-1 gap-1">
          <Label htmlFor="name">Project name</Label>
          <Input
            id="name"
            placeholder="Website"
            {...register("name", {
              onChange: (e) => {
                // Suggest a key until the user types their own
                if (!dirtyFields.key)
                  setValue("key", suggestKey(e.target.value));
              },
            })}
          />
        </div>
        <div className="grid w-28 gap-1">
          <Label htmlFor="key">Key</Label>
          <Input
            id="key"
            placeholder="WEB"
            maxLength={5}
            {...register("key")}
          />
        </div>
      </div>
      {errors.name && (
        <p className="text-sm text-destructive">{errors.name.message}</p>
      )}
      {errors.key && (
        <p className="text-sm text-destructive">{errors.key.message}</p>
      )}
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        Create project
      </Button>
    </form>
  );
}
