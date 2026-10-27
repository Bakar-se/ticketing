"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateForm } from "@/components/create-form";
import { api } from "@/lib/api";

type Ticket = {
  id: string;
  ticketKey: string;
  title: string;
  status: string;
  priority: string;
};

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const load = () =>
    api<{ items: Ticket[] }>(`/projects/${id}/tickets?pageSize=100`)
      .then((r) => setTickets(r.items))
      .catch(() => {});
  useEffect(() => {
    load();
  }, [id]);

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <Link className="text-sm underline" href="/">
        ← Projects
      </Link>
      <h1 className="text-2xl font-semibold">Tickets</h1>
      <CreateForm
        placeholder="New ticket title"
        submitLabel="Create"
        onSubmit={async (title) => {
          await api(`/projects/${id}/tickets`, {
            method: "POST",
            body: JSON.stringify({ title }),
          });
          load();
        }}
      />
      <ul className="space-y-1">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link className="underline" href={`/tickets/${t.id}`}>
              {t.ticketKey} · {t.title}
            </Link>{" "}
            <span className="text-sm text-muted-foreground">
              [{t.status}] {t.priority}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
