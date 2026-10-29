"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, queryKeys } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "Key must be 2 to 5 letters"),
  description: z.string().trim().max(500, "Must be 500 characters or less"),
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

export function CreateProjectForm({
  onCreated,
  onCancel,
}: {
  onCreated: (project: { id: string }) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const createProject = useMutation({
    mutationFn: async (values: {
      name: string;
      key: string;
      description?: string;
    }) => (await api.post<{ id: string }>("/projects", values)).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", key: "", description: "" },
  });

  async function onSubmit(values: Values) {
    setServerError("");
    clearErrors("key");
    try {
      const created = await createProject.mutateAsync({
        name: values.name,
        key: values.key,
        ...(values.description ? { description: values.description } : {}),
      });
      reset();
      onCreated(created);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("already in use")) {
        setError("key", { message });
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid gap-1">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          placeholder="e.g. Web app"
          aria-invalid={!!errors.name}
          className="h-10"
          {...register("name", {
            onChange: (e) => {
              if (!dirtyFields.key) setValue("key", suggestKey(e.target.value));
            },
          })}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="project-key">Key</Label>
        <Input
          id="project-key"
          placeholder="WEB"
          maxLength={5}
          autoCapitalize="characters"
          aria-invalid={!!errors.key}
          className="h-10 uppercase"
          {...register("key")}
        />
        {errors.key ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.key.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {"2 to 5 letters, like WEB-12. It can't be changed later."}
          </p>
        )}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="project-description">Description</Label>
        <textarea
          id="project-description"
          placeholder="What is this project for?"
          aria-invalid={!!errors.description}
          className="min-h-[88px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
          {...register("description")}
        />
        {errors.description && (
          <p role="alert" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create project"}
        </Button>
      </div>
    </form>
  );
}
