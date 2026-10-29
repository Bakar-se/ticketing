"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api, queryKeys } from "@/lib/api";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  STORY_POINTS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000, "Must be 5000 characters or less"),
  status: z.enum(TICKET_STATUSES),
  priority: z.enum(TICKET_PRIORITIES),
  storyPoints: z.enum(["none", "1", "2", "3", "5", "8", "13"]),
  dueDate: z.string(),
});
type Values = z.infer<typeof schema>;

const textAreaClass =
  "min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

function isStatus(value: string): value is TicketStatus {
  return TICKET_STATUSES.some((status) => status === value);
}

function isPriority(value: string): value is TicketPriority {
  return TICKET_PRIORITIES.some((priority) => priority === value);
}

export function CreateTicketForm({
  projectId,
  defaultStatus,
  onCreated,
  onCancel,
}: {
  projectId: string;
  defaultStatus: TicketStatus;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const createTicket = useMutation({
    mutationFn: (body: {
      title: string;
      description?: string;
      status: TicketStatus;
      priority: TicketPriority;
      storyPoints?: number;
      dueDate?: string;
    }) => api.post(`/projects/${projectId}/tickets`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTickets(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      status: defaultStatus,
      priority: "MEDIUM",
      storyPoints: "none",
      dueDate: "",
    },
  });

  async function onSubmit(values: Values) {
    setServerError("");
    try {
      await createTicket.mutateAsync({
        title: values.title,
        status: values.status,
        priority: values.priority,
        ...(values.description ? { description: values.description } : {}),
        ...(values.storyPoints !== "none"
          ? { storyPoints: Number(values.storyPoints) }
          : {}),
        ...(values.dueDate ? { dueDate: values.dueDate } : {}),
      });
      onCreated();
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 400
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-1">
        <Label htmlFor="ticket-title">Title</Label>
        <Input
          id="ticket-title"
          placeholder="Short summary"
          aria-invalid={!!errors.title}
          className="h-10"
          {...register("title")}
        />
        {errors.title && (
          <p role="alert" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ticket-description">Description</Label>
        <textarea
          id="ticket-description"
          placeholder="Add more detail"
          aria-invalid={!!errors.description}
          className={textAreaClass}
          {...register("description")}
        />
        {errors.description && (
          <p role="alert" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <div className="grid gap-1">
              <Label htmlFor="ticket-status">Status</Label>
              <Select
                items={TICKET_STATUSES.map((status) => ({
                  value: status,
                  label: STATUS_LABEL[status],
                }))}
                value={field.value}
                onValueChange={(value) => {
                  if (value && isStatus(value)) field.onChange(value);
                }}
              >
                <SelectTrigger id="ticket-status" className="h-10 w-full data-[size=default]:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="min-h-10">
                      {STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <div className="grid gap-1">
              <Label htmlFor="ticket-priority">Priority</Label>
              <Select
                items={TICKET_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: PRIORITY_LABEL[priority],
                }))}
                value={field.value}
                onValueChange={(value) => {
                  if (value && isPriority(value)) field.onChange(value);
                }}
              >
                <SelectTrigger
                  id="ticket-priority"
                  className="h-10 w-full data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority} className="min-h-10">
                      {PRIORITY_LABEL[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        <Controller
          name="storyPoints"
          control={control}
          render={({ field }) => (
            <div className="grid gap-1">
              <Label htmlFor="ticket-points">Story points</Label>
              <Select
                items={[
                  { value: "none", label: "None" },
                  ...STORY_POINTS.map((points) => ({
                    value: String(points),
                    label: String(points),
                  })),
                ]}
                value={field.value === "none" ? null : field.value}
                onValueChange={(value) => field.onChange(value ?? "none")}
              >
                <SelectTrigger
                  id="ticket-points"
                  className="h-10 w-full data-[size=default]:h-10"
                >
                  <SelectValue placeholder="e.g. 3" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="min-h-10">
                    None
                  </SelectItem>
                  {STORY_POINTS.map((points) => (
                    <SelectItem key={points} value={String(points)} className="min-h-10">
                      {points}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        <div className="grid gap-1">
          <Label htmlFor="ticket-due">Due date</Label>
          <Input id="ticket-due" type="date" className="h-10" {...register("dueDate")} />
        </div>
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create ticket"}
        </Button>
      </div>
    </form>
  );
}
