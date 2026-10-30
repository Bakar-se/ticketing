"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTicketChrome } from "@/components/ticket-chrome";
import { ApiError, api, queryKeys } from "@/lib/api";
import { timeAgo } from "@/lib/projects";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  STATUS_LABEL,
  formatCreated,
  formatDue,
  type Ticket,
} from "@/lib/tickets";
import { cn } from "cn";

type Member = { userId: string; name: string; email: string };
type Comment = {
  id: string;
  body: string;
  createdById: string;
  createdAt: string;
};

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
    return <h1 className="text-2xl font-semibold">Couldn&apos;t load this ticket</h1>;
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

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">
          {ticket.ticketKey}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {ticket.title}
        </h1>
        <h2 className="mt-6 text-sm font-semibold">Description</h2>
        <p className="mt-2 text-sm whitespace-pre-wrap">{description}</p>
        <h2 className="mt-8 text-sm font-semibold">
          {commentsQuery.isSuccess
            ? `Comments ${comments.length}`
            : "Comments"}
        </h2>
        {commentsQuery.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading comments…</p>
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
          <Detail label="Status">{STATUS_LABEL[ticket.status]}</Detail>
          <Detail label="Assignee">
            {assigneeName ? (
              ticket.assigneeId ? (
                <span className="flex items-center gap-2">
                  <Initials name={assigneeName} />
                  {assigneeName}
                </span>
              ) : (
                assigneeName
              )
            ) : null}
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
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                PRIORITY_CLASS[ticket.priority],
              )}
            >
              {PRIORITY_LABEL[ticket.priority]}
            </span>
          </Detail>
          <Detail label="Story points">
            {ticket.storyPoints == null ? "—" : ticket.storyPoints}
          </Detail>
          <Detail label="Due date">{formatDue(ticket.dueDate) ?? "No date"}</Detail>
          <Detail label="Created">{formatCreated(ticket.createdAt)}</Detail>
          <Detail label="Updated">{timeAgo(ticket.updatedAt)}</Detail>
        </dl>
      </section>
    </div>
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
