"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, Search } from "lucide-react";
import { CreateTicketForm } from "@/components/create-ticket-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, queryKeys } from "@/lib/api";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  TICKET_PRIORITIES,
  formatDue,
  type Ticket,
  type TicketPriority,
} from "@/lib/tickets";
import { cn } from "cn";

type Member = {
  userId: string;
  name: string;
  email: string;
};

type BacklogData = {
  items: Ticket[];
  total: number;
  truncated: boolean;
};

type AssigneeFilter = "all" | "unassigned" | string;

function backlogKey(projectId: string) {
  return [...queryKeys.projectTickets(projectId), "BACKLOG"] as const;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function countLabel(count: number) {
  return `${count} ${count === 1 ? "ticket" : "tickets"}`;
}

function pointsLabel(points: number) {
  return `${points} ${points === 1 ? "pt" : "pts"}`;
}

function isPriority(value: string): value is TicketPriority {
  return TICKET_PRIORITIES.some((priority) => priority === value);
}

function BacklogRow({
  ticket,
  members,
  dragEnabled,
  handleRef,
  handleProps,
  onAssign,
  onMove,
  onDelete,
}: {
  ticket: Ticket;
  members: Member[];
  dragEnabled: boolean;
  handleRef?: (node: HTMLButtonElement | null) => void;
  handleProps?: ComponentProps<"button">;
  onAssign: (assigneeId: string | null) => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const assignee = members.find((member) => member.userId === ticket.assigneeId);
  const due = formatDue(ticket.dueDate) ?? "No date";

  return (
    <div className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
      <button
        type="button"
        ref={handleRef}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground enabled:cursor-grab enabled:touch-none enabled:active:cursor-grabbing disabled:cursor-default"
        aria-label={`Reorder ${ticket.ticketKey}`}
        disabled={!dragEnabled}
        {...(dragEnabled ? handleProps : {})}
      >
        <GripVertical className="size-4" />
      </button>
      <Link
        href={`/tickets/${ticket.id}`}
        className="w-16 shrink-0 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        {ticket.ticketKey}
      </Link>
      <Link
        href={`/tickets/${ticket.id}`}
        className="min-w-0 flex-1 truncate text-sm hover:underline"
      >
        {ticket.title}
      </Link>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
          PRIORITY_CLASS[ticket.priority],
        )}
      >
        {PRIORITY_LABEL[ticket.priority]}
      </span>
      <span className="w-12 shrink-0 text-right text-sm text-muted-foreground">
        {ticket.storyPoints == null ? "—" : pointsLabel(ticket.storyPoints)}
      </span>
      <span className="w-16 shrink-0 text-sm text-muted-foreground">{due}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={
            assignee
              ? `Assignee ${assignee.name}. Change assignee`
              : `Assign ${ticket.ticketKey}`
          }
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {assignee ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {initials(assignee.name)}
            </span>
          ) : (
            <span className="size-7 rounded-full border border-dashed border-muted-foreground/60" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="min-h-10" onClick={() => onAssign(null)}>
            Unassigned
          </DropdownMenuItem>
          {members.map((member) => (
            <DropdownMenuItem
              key={member.userId}
              className="min-h-10"
              onClick={() => onAssign(member.userId)}
            >
              {member.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${ticket.ticketKey}`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="min-h-10"
            render={<Link href={`/tickets/${ticket.id}`} />}
          >
            Open
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-10" onClick={onMove}>
            Move to To do
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-10"
            variant="destructive"
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortableBacklogRow(
  props: Omit<ComponentProps<typeof BacklogRow>, "handleRef" | "handleProps" | "dragEnabled">,
) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.ticket.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "relative z-10 bg-background opacity-70")}
    >
      <BacklogRow
        {...props}
        dragEnabled
        handleRef={setActivatorNodeRef}
        handleProps={{ ...attributes, ...listeners } as ComponentProps<"button">}
      />
    </div>
  );
}

function SortableList({
  tickets,
  members,
  onReorder,
  onAssign,
  onMove,
  onDelete,
}: {
  tickets: Ticket[];
  members: Member[];
  onReorder: (ids: string[]) => void;
  onAssign: (ticketId: string, assigneeId: string | null) => void;
  onMove: (ticketId: string) => void;
  onDelete: (ticket: Ticket) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tickets.findIndex((ticket) => ticket.id === active.id);
    const newIndex = tickets.findIndex((ticket) => ticket.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(tickets, oldIndex, newIndex).map((ticket) => ticket.id));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext
        items={tickets.map((ticket) => ticket.id)}
        strategy={verticalListSortingStrategy}
      >
        {tickets.map((ticket) => (
          <SortableBacklogRow
            key={ticket.id}
            ticket={ticket}
            members={members}
            onAssign={(assigneeId) => onAssign(ticket.id, assigneeId)}
            onMove={() => onMove(ticket.id)}
            onDelete={() => onDelete(ticket)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function ProjectBacklog() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");
  const [assignee, setAssignee] = useState<AssigneeFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Ticket | null>(null);
  const [actionError, setActionError] = useState("");
  const listKey = backlogKey(id);

  const ticketsQuery = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const response = await api.get<{ items: Ticket[]; total: number }>(
        `/projects/${id}/tickets`,
        {
          params: {
            status: "BACKLOG",
            sort: "position",
            order: "asc",
            pageSize: 100,
          },
        },
      );
      return {
        items: response.data.items,
        total: response.data.total,
        truncated: response.data.total > response.data.items.length,
      } satisfies BacklogData;
    },
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.projectMembers(id),
    queryFn: async () => (await api.get<Member[]>(`/projects/${id}/members`)).data,
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      api.patch(`/projects/${id}/tickets/reorder`, { ids }),
    onMutate: async (ids) => {
      setActionError("");
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<BacklogData>(listKey);
      queryClient.setQueryData<BacklogData>(listKey, (current) => {
        if (!current) return current;
        const byId = new Map(current.items.map((ticket) => [ticket.id, ticket]));
        const items = ids.flatMap((ticketId, position) => {
          const ticket = byId.get(ticketId);
          return ticket ? [{ ...ticket, position }] : [];
        });
        return { ...current, items };
      });
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
      setActionError("Couldn't save the new order. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectTickets(id) });
    },
  });

  const assign = useMutation({
    mutationFn: (variables: { ticketId: string; assigneeId: string | null }) =>
      api.patch(`/tickets/${variables.ticketId}`, {
        assigneeId: variables.assigneeId,
      }),
    onMutate: async (variables) => {
      setActionError("");
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<BacklogData>(listKey);
      queryClient.setQueryData<BacklogData>(listKey, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((ticket) =>
                ticket.id === variables.ticketId
                  ? { ...ticket, assigneeId: variables.assigneeId }
                  : ticket,
              ),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
      setActionError("Couldn't update the assignee. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const move = useMutation({
    mutationFn: (ticketId: string) =>
      api.patch(`/tickets/${ticketId}`, { status: "TODO" }),
    onMutate: async (ticketId) => {
      setActionError("");
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<BacklogData>(listKey);
      queryClient.setQueryData<BacklogData>(listKey, (current) =>
        current
          ? {
              ...current,
              total: Math.max(0, current.total - 1),
              items: current.items.filter((ticket) => ticket.id !== ticketId),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _ticketId, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
      setActionError("Couldn't move that ticket. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectTickets(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });

  const remove = useMutation({
    mutationFn: (ticketId: string) => api.delete(`/tickets/${ticketId}`),
    onMutate: async (ticketId) => {
      setActionError("");
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<BacklogData>(listKey);
      queryClient.setQueryData<BacklogData>(listKey, (current) =>
        current
          ? {
              ...current,
              total: Math.max(0, current.total - 1),
              items: current.items.filter((ticket) => ticket.id !== ticketId),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _ticketId, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
      setActionError("Couldn't delete that ticket. Please try again.");
    },
    onSuccess: () => setPendingDelete(null),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectTickets(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });

  const tickets = ticketsQuery.data?.items ?? [];
  const members = membersQuery.data ?? [];
  const needle = query.trim().toLowerCase();
  const filtering = needle.length > 0 || priority !== "all" || assignee !== "all";
  const visible = tickets.filter((ticket) => {
    if (priority !== "all" && ticket.priority !== priority) return false;
    if (assignee === "unassigned" && ticket.assigneeId) return false;
    if (assignee !== "all" && assignee !== "unassigned" && ticket.assigneeId !== assignee) {
      return false;
    }
    if (!needle) return true;
    return (
      ticket.title.toLowerCase().includes(needle) ||
      ticket.ticketKey.toLowerCase().includes(needle)
    );
  });
  const truncated = ticketsQuery.data?.truncated ?? false;
  const reorderEnabled = !filtering && !truncated && tickets.length > 1 && !reorder.isPending;
  const total = ticketsQuery.data?.total ?? 0;
  const points = tickets.reduce((sum, ticket) => sum + (ticket.storyPoints ?? 0), 0);
  const assigneeItems = [
    { value: "all", label: "All" },
    { value: "unassigned", label: "Unassigned" },
    ...members.map((member) => ({ value: member.userId, label: member.name })),
  ];
  const priorityItems = [
    { value: "all", label: "All" },
    ...TICKET_PRIORITIES.map((item) => ({
      value: item,
      label: PRIORITY_LABEL[item],
    })),
  ];

  function onAssign(ticketId: string, assigneeId: string | null) {
    assign.mutate({ ticketId, assigneeId });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Backlog</h1>
          <p className="text-sm text-muted-foreground">
            Order tickets by priority, then move them to the board when ready.
          </p>
        </div>
        <Button type="button" className="h-10" onClick={() => setCreateOpen(true)}>
          New ticket
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search backlog..."
            aria-label="Search backlog"
            className="h-10 pl-8"
          />
        </div>
        <Select
          items={assigneeItems}
          value={assignee}
          onValueChange={(value) => {
            if (value) setAssignee(value);
          }}
        >
          <SelectTrigger
            aria-label="Filter by assignee"
            className="h-10 w-auto data-[size=default]:h-10"
          >
            <span className="text-muted-foreground">Assignee</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assigneeItems.map((item) => (
              <SelectItem key={item.value} value={item.value} className="min-h-10">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={priorityItems}
          value={priority}
          onValueChange={(value) => {
            if (!value) return;
            if (value === "all" || isPriority(value)) setPriority(value);
          }}
        >
          <SelectTrigger
            aria-label="Filter by priority"
            className="h-10 w-auto data-[size=default]:h-10"
          >
            <span className="text-muted-foreground">Priority</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityItems.map((item) => (
              <SelectItem key={item.value} value={item.value} className="min-h-10">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {membersQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not load assignees.
        </p>
      )}
      {truncated && (
        <p className="text-sm text-muted-foreground">
          Showing the first 100 backlog tickets. Clear some before reordering.
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {ticketsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ticketsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load the backlog.
        </p>
      ) : (
        <section className="overflow-hidden rounded-xl border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Backlog</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {countLabel(total)}
            </span>
            <span className="text-xs text-muted-foreground">{pointsLabel(points)}</span>
          </div>
          <div>
              {reorderEnabled ? (
                <SortableList
                  tickets={tickets}
                  members={members}
                  onReorder={(ids) => reorder.mutate(ids)}
                  onAssign={onAssign}
                  onMove={(ticketId) => move.mutate(ticketId)}
                  onDelete={setPendingDelete}
                />
              ) : (
                visible.map((ticket) => (
                  <BacklogRow
                    key={ticket.id}
                    ticket={ticket}
                    members={members}
                    dragEnabled={false}
                    onAssign={(assigneeId) => onAssign(ticket.id, assigneeId)}
                    onMove={() => move.mutate(ticket.id)}
                    onDelete={() => setPendingDelete(ticket)}
                  />
                ))
              )}
              {visible.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {filtering || tickets.length > 0 ? "No matches" : "No tickets"}
                </p>
              )}
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Create ticket
          </button>
        </section>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create ticket</DialogTitle>
            <DialogDescription>Add a ticket to the backlog.</DialogDescription>
          </DialogHeader>
          <CreateTicketForm
            key={createOpen ? "open" : "closed"}
            projectId={id}
            defaultStatus="BACKLOG"
            onCreated={() => setCreateOpen(false)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete ticket</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `${pendingDelete.ticketKey} will be deleted, including its comments.`
                : "This ticket will be deleted."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setPendingDelete(null)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              disabled={!pendingDelete || remove.isPending}
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete.id);
              }}
            >
              {remove.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
