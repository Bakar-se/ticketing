"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateForm } from "@/components/create-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, queryKeys } from "@/lib/api";

type Ticket = { id: string; title: string; status: string; projectId: string };
type Comment = { id: string; body: string };

export function TicketView() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const ticketQuery = useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,
  });
  const commentsQuery = useQuery({
    queryKey: queryKeys.comments(id),
    queryFn: async () =>
      (await api.get<Comment[]>(`/tickets/${id}/comments`)).data,
  });
  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/tickets/${id}`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.ticket(id) }),
  });
  const commentMutation = useMutation({
    mutationFn: (body: string) => api.post(`/tickets/${id}/comments`, { body }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(id) }),
  });

  if (ticketQuery.isPending) return <main className="p-6">Loading…</main>;
  const ticket = ticketQuery.data;
  if (!ticket) return <main className="p-6">Ticket not found</main>;

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <Link className="text-sm underline" href={`/projects/${ticket.projectId}`}>← Tickets</Link>
      <h1 className="text-2xl font-semibold">{ticket.title}</h1>
      <Select
        value={ticket.status}
        onValueChange={(value) => value && statusMutation.mutate(value)}
      >
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="BACKLOG">BACKLOG</SelectItem>
          <SelectItem value="TODO">TODO</SelectItem>
          <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
          <SelectItem value="DONE">DONE</SelectItem>
        </SelectContent>
      </Select>
      <h2 className="text-lg font-medium">Comments</h2>
      <ul className="space-y-1">
        {(commentsQuery.data ?? []).map((c) => (
          <li key={c.id}>{c.body}</li>
        ))}
      </ul>
      <CreateForm
        placeholder="Add a comment"
        submitLabel="Post"
        onSubmit={async (body) => {
          await commentMutation.mutateAsync(body);
        }}
      />
    </main>
  );
}
