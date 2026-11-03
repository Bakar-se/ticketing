"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTicketChrome } from "@/components/ticket-chrome";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api, queryKeys } from "@/lib/api";
import { timeAgo } from "@/lib/projects";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  STATUS_LABEL,
  STORY_POINTS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  formatCreated,
  formatDue,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";
import { cn } from "cn";

type Member = { userId: string; name: string; email: string };
type Comment = {
  id: string;
  body: string;
  createdById: string;
  createdAt: string;
};
type TicketPatch = Partial<
  Pick<
    Ticket,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "storyPoints"
    | "dueDate"
    | "assigneeId"
  >
>;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function personName(members: Member[] | undefined, userId: string) {
  if (!members) return null;
  return members.find((member) => member.userId === userId)?.name ?? "Unknown";
}

export function TicketPage() {
  const params = useParams<{ id: string; ticketId: string }>();
  const projectId = params.id;
  const ticketId = params.ticketId;
  const { setChrome } = useTicketChrome();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [editing, setEditing] = useState<"title" | "description" | null>(null);
  const [draft, setDraft] = useState("");

  const ticketQuery = useQuery({
    queryKey: queryKeys.ticket(ticketId),
    queryFn: async () => (await api.get<Ticket>(`/tickets/${ticketId}`)).data,
  });
  const commentsQuery = useQuery({
    queryKey: queryKeys.comments(ticketId),
    queryFn: async () =>
      (await api.get<Comment[]>(`/tickets/${ticketId}/comments`)).data,
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: async () =>
      (await api.get<Member[]>(`/projects/${projectId}/members`)).data,
  });

  const save = useMutation({
    mutationFn: async (patch: TicketPatch) =>
      (await api.patch<Ticket>(`/tickets/${ticketId}`, patch)).data,
    onMutate: async (patch) => {
      setSaveError("");
      await queryClient.cancelQueries({ queryKey: queryKeys.ticket(ticketId) });
      const previous = queryClient.getQueryData<Ticket>(
        queryKeys.ticket(ticketId),
      );
      if (previous) {
        queryClient.setQueryData<Ticket>(queryKeys.ticket(ticketId), {
          ...previous,
          ...patch,
        });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.ticket(ticketId), context.previous);
      }
      setSaveError("Couldn't save that change. Please try again.");
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.ticket(ticketId), updated);
    },
  });

  const ticket = ticketQuery.data;
  const belongs = ticket != null && ticket.projectId === projectId;
  const missing =
    ticketQuery.isError &&
    ticketQuery.error instanceof ApiError &&
    ticketQuery.error.status === 404;

  useEffect(() => {
    if (!belongs || !ticket) {
      setChrome(null);
      return;
    }
    setChrome({
      section: ticket.status === "BACKLOG" ? "backlog" : "board",
      ticketKey: ticket.ticketKey,
    });
    return () => setChrome(null);
  }, [belongs, setChrome, ticket]);

  if (ticketQuery.isPending) return <p>Loading…</p>;
  if (missing || (ticket != null && ticket.projectId !== projectId)) {
    return <h1 className="text-2xl font-semibold">Ticket not found</h1>;
  }
  if (!ticket) {
    return (
      <h1 className="text-2xl font-semibold">Couldn&apos;t load this ticket</h1>
    );
  }

  const members = membersQuery.isSuccess ? membersQuery.data : undefined;
  const comments = commentsQuery.data ?? [];
  const assigneeName = ticket.assigneeId
    ? personName(members, ticket.assigneeId)
    : "Unassigned";
  const reporterName = personName(members, ticket.createdById);
  const description = ticket.description?.trim()
    ? ticket.description
    : "No description";
  const assigneeOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...(members ?? []).map((member) => ({
      value: member.userId,
      label: member.name,
    })),
  ];
  if (
    ticket.assigneeId &&
    !assigneeOptions.some((item) => item.value === ticket.assigneeId)
  ) {
    assigneeOptions.push({
      value: ticket.assigneeId,
      label: assigneeName ?? "Unknown",
    });
  }

  function commitTitle() {
    if (!ticket) return;
    const next = draft.trim();
    setEditing(null);
    if (!next) {
      setTitleError("Title is required.");
      return;
    }
    setTitleError("");
    if (next !== ticket.title) save.mutate({ title: next });
  }

  function commitDescription() {
    if (!ticket) return;
    const next = draft.trim();
    const current = ticket.description?.trim() ?? "";
    setEditing(null);
    if (next === current) return;
    save.mutate({ description: next ? next : null });
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">
          {ticket.ticketKey}
        </p>
        {editing === "title" ? (
          <Input
            aria-label="Title"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            className="mt-1 h-auto py-1 text-2xl font-semibold md:text-2xl"
          />
        ) : (
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            <button
              type="button"
              className="text-left"
              onClick={() => {
                setTitleError("");
                setDraft(ticket.title);
                setEditing("title");
              }}
            >
              {ticket.title}
            </button>
          </h1>
        )}
        {titleError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {titleError}
          </p>
        ) : null}
        {saveError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
        <h2 className="mt-6 text-sm font-semibold">Description</h2>
        {editing === "description" ? (
          <textarea
            aria-label="Description"
            value={draft}
            autoFocus
            rows={4}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDescription}
            className="mt-2 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        ) : (
          <button
            type="button"
            className="mt-2 text-left text-sm whitespace-pre-wrap"
            onClick={() => {
              setDraft(ticket.description ?? "");
              setEditing("description");
            }}
          >
            {description}
          </button>
        )}
        <h2 className="mt-8 text-sm font-semibold">
          {commentsQuery.isSuccess ? `Comments ${comments.length}` : "Comments"}
        </h2>
        {commentsQuery.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Loading comments…
          </p>
        ) : commentsQuery.isError ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Couldn&apos;t load comments.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {comments.map((comment) => {
              const name = personName(members, comment.createdById) ?? "";
              return (
                <li key={comment.id} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initials(name)}
                  </span>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{name}</span>{" "}
                      <span className="text-muted-foreground">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <section aria-label="Details" className="rounded-lg border p-4 text-sm">
        <dl>
          <Detail label="Status">
            <FieldSelect
              label="Status"
              value={ticket.status}
              items={TICKET_STATUSES.map((status) => ({
                value: status,
                label: STATUS_LABEL[status],
              }))}
              onValueChange={(value) => {
                if (TICKET_STATUSES.includes(value as TicketStatus)) {
                  save.mutate({ status: value as TicketStatus });
                }
              }}
            />
          </Detail>
          <Detail label="Assignee">
            <FieldSelect
              label="Assignee"
              value={ticket.assigneeId ?? "unassigned"}
              items={assigneeOptions}
              onValueChange={(value) => {
                save.mutate({
                  assigneeId: value === "unassigned" ? null : value,
                });
              }}
            >
              {ticket.assigneeId && assigneeName ? (
                <span className="flex items-center gap-2">
                  <Initials name={assigneeName} />
                  <SelectValue />
                </span>
              ) : (
                <SelectValue />
              )}
            </FieldSelect>
          </Detail>
          <Detail label="Reporter">
            {reporterName ? (
              <span className="flex items-center gap-2">
                <Initials name={reporterName} />
                {reporterName}
              </span>
            ) : null}
          </Detail>
          <Detail label="Priority">
            <FieldSelect
              label="Priority"
              value={ticket.priority}
              triggerClassName={PRIORITY_CLASS[ticket.priority]}
              items={TICKET_PRIORITIES.map((priority) => ({
                value: priority,
                label: PRIORITY_LABEL[priority],
              }))}
              onValueChange={(value) => {
                if (TICKET_PRIORITIES.includes(value as TicketPriority)) {
                  save.mutate({ priority: value as TicketPriority });
                }
              }}
            />
          </Detail>
          <Detail label="Story points">
            <FieldSelect
              label="Story points"
              value={
                ticket.storyPoints == null ? "none" : String(ticket.storyPoints)
              }
              items={[
                { value: "none", label: "—" },
                ...STORY_POINTS.map((points) => ({
                  value: String(points),
                  label: String(points),
                })),
              ]}
              onValueChange={(value) => {
                save.mutate({
                  storyPoints: value === "none" ? null : Number(value),
                });
              }}
            />
          </Detail>
          <Detail label="Due date">
            <span className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Due date"
                value={ticket.dueDate ? ticket.dueDate.slice(0, 10) : ""}
                onChange={(event) => {
                  const next = event.target.value || null;
                  const current = ticket.dueDate
                    ? ticket.dueDate.slice(0, 10)
                    : null;
                  if (next === current) return;
                  save.mutate({ dueDate: next });
                }}
                className="h-8 w-auto"
              />
              <span>
                {ticket.dueDate ? formatDue(ticket.dueDate) : "No date"}
              </span>
            </span>
          </Detail>
          <Detail label="Created">{formatCreated(ticket.createdAt)}</Detail>
          <Detail label="Updated">{timeAgo(ticket.updatedAt)}</Detail>
        </dl>
      </section>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  items,
  onValueChange,
  triggerClassName,
  children,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onValueChange: (value: string) => void;
  triggerClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next && next !== value) onValueChange(next);
      }}
    >
      <SelectTrigger
        aria-label={label}
        className={cn("h-8 w-auto", triggerClassName)}
      >
        {children ?? <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Initials({ name }: { name: string }) {
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
      {initials(name)}
    </span>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
