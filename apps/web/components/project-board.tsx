"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Search } from "lucide-react";
import { CreateTicketForm } from "@/components/create-ticket-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, queryKeys } from "@/lib/api";
import {
  BOARD_COLUMNS,
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  isBoardStatus,
  ticketMeta,
  type BoardStatus,
  type Ticket,
  type TicketStatus,
} from "@/lib/tickets";
import { cn } from "cn";

type BoardData = {
  items: Ticket[];
  truncated: boolean;
};

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

function TicketCard({ ticket }: { ticket: Ticket }) {
  const meta = ticketMeta(ticket);
  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tickets/${ticket.id}`}
          className="font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {ticket.ticketKey}
        </Link>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            PRIORITY_CLASS[ticket.priority],
          )}
        >
          {PRIORITY_LABEL[ticket.priority]}
        </span>
      </div>
      <Link
        href={`/tickets/${ticket.id}`}
        className="mt-2 block text-sm font-medium leading-5"
      >
        {ticket.title}
      </Link>
      {meta && <p className="mt-3 text-xs text-muted-foreground">{meta}</p>}
    </article>
  );
}

function DraggableTicket({ ticket }: { ticket: Ticket }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { status: ticket.status },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
      role="group"
      aria-label={`Drag ${ticket.ticketKey}`}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
}

function BoardColumn({
  status,
  label,
  tickets,
  searching,
  onAdd,
}: {
  status: BoardStatus;
  label: string;
  tickets: Ticket[];
  searching: boolean;
  onAdd: (status: BoardStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-80 flex-col gap-3 rounded-xl bg-muted/60 p-3",
        isOver && "ring-2 ring-foreground/15",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">{label}</h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs text-muted-foreground">
            {tickets.length}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Add ticket to ${label}`}
          onClick={() => onAdd(status)}
        >
          <Plus />
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tickets.map((ticket) => (
          <DraggableTicket key={ticket.id} ticket={ticket} />
        ))}
        {tickets.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            {searching ? "No matches" : "No tickets"}
          </p>
        )}
      </div>
    </section>
  );
}

export function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TicketStatus>("BACKLOG");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const projectQuery = useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async () =>
      (await api.get<{ name: string }>(`/projects/${id}`)).data,
  });
  const ticketsQuery = useQuery({
    queryKey: queryKeys.projectTickets(id),
    queryFn: async () => {
      const pages = await Promise.all(
        BOARD_COLUMNS.map((column) =>
          api
            .get<{ items: Ticket[]; total: number }>(`/projects/${id}/tickets`, {
              params: {
                status: column.status,
                pageSize: 100,
                sort: "number",
                order: "desc",
              },
            })
            .then((response) => response.data),
        ),
      );
      return {
        items: pages.flatMap((page) => page.items),
        truncated: pages.some((page) => page.total > page.items.length),
      } satisfies BoardData;
    },
  });

  const moveTicket = useMutation({
    mutationFn: (variables: { id: string; status: BoardStatus }) =>
      api.patch(`/tickets/${variables.id}`, { status: variables.status }),
    onMutate: async (variables) => {
      setMoveError("");
      await queryClient.cancelQueries({ queryKey: queryKeys.projectTickets(id) });
      const previous = queryClient.getQueryData<BoardData>(
        queryKeys.projectTickets(id),
      );
      queryClient.setQueryData<BoardData>(queryKeys.projectTickets(id), (current) =>
        current
          ? {
              ...current,
              items: current.items.map((ticket) =>
                ticket.id === variables.id
                  ? { ...ticket, status: variables.status }
                  : ticket,
              ),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.projectTickets(id), context.previous);
      }
      setMoveError("Couldn't update that ticket. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectTickets(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });

  const needle = query.trim().toLowerCase();
  const tickets = ticketsQuery.data?.items ?? [];
  const visible = tickets.filter((ticket) => {
    if (!needle) return true;
    return (
      ticket.title.toLowerCase().includes(needle) ||
      ticket.ticketKey.toLowerCase().includes(needle)
    );
  });
  const activeTicket = tickets.find((ticket) => ticket.id === activeId) ?? null;

  function openCreate(status: TicketStatus) {
    setCreateStatus(status);
    setCreateOpen(true);
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const ticket = tickets.find((item) => item.id === String(event.active.id));
    const overId = event.over ? String(event.over.id) : "";
    if (!ticket || !isBoardStatus(overId) || overId === ticket.status) return;
    moveTicket.mutate({ id: ticket.id, status: overId });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Board</h1>
          <p className="text-sm text-muted-foreground">
            Drag tickets between columns to update their status.
          </p>
        </div>
        <Button type="button" className="h-10" onClick={() => openCreate("BACKLOG")}>
          New ticket
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tickets..."
          aria-label="Search tickets"
          className="h-10 pl-8"
        />
      </div>

      {ticketsQuery.data?.truncated && (
        <p className="text-sm text-muted-foreground">
          Showing the first 100 tickets in each column.
        </p>
      )}
      {moveError && (
        <p role="alert" className="text-sm text-destructive">
          {moveError}
        </p>
      )}

      {ticketsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ticketsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load tickets.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          <div className="grid items-start gap-4 md:grid-cols-3">
            {BOARD_COLUMNS.map((column) => (
              <BoardColumn
                key={column.status}
                status={column.status}
                label={column.label}
                searching={needle.length > 0}
                tickets={visible.filter((ticket) => ticket.status === column.status)}
                onAdd={openCreate}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTicket ? <TicketCard ticket={activeTicket} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create ticket</DialogTitle>
            <DialogDescription>
              {`Add a ticket to ${projectQuery.data?.name ?? "this project"}.`}
            </DialogDescription>
          </DialogHeader>
          <CreateTicketForm
            key={`${createStatus}-${createOpen}`}
            projectId={id}
            defaultStatus={createStatus}
            onCreated={() => setCreateOpen(false)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
