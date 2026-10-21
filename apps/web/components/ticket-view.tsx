"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateForm } from "@/components/create-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

type Ticket = { id: string; title: string; status: string; projectId: string };
type Comment = { id: string; body: string };

export function TicketView() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const load = () => {
    api<Ticket>(`/tickets/${id}`).then(setTicket).catch(() => {});
    api<Comment[]>(`/tickets/${id}/comments`).then(setComments).catch(() => {});
  };
  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status: string) {
    await api(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  if (!ticket) return <main className="p-6">Loading…</main>;

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <Link className="text-sm underline" href={`/projects/${ticket.projectId}`}>← Tickets</Link>
      <h1 className="text-2xl font-semibold">{ticket.title}</h1>
      <Select value={ticket.status} onValueChange={(value) => value && setStatus(value)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="TODO">TODO</SelectItem>
          <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
          <SelectItem value="DONE">DONE</SelectItem>
        </SelectContent>
      </Select>
      <h2 className="text-lg font-medium">Comments</h2>
      <ul className="space-y-1">
        {comments.map((c) => (
          <li key={c.id}>{c.body}</li>
        ))}
      </ul>
      <CreateForm
        placeholder="Add a comment"
        submitLabel="Post"
        onSubmit={async (body) => {
          await api(`/tickets/${id}/comments`, { method: "POST", body: JSON.stringify({ body }) });
          load();
        }}
      />
    </main>
  );
}