"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ApiError, api, queryKeys } from "@/lib/api";
import { ticketPath, type Ticket } from "@/lib/tickets";

export function TicketView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ticketQuery = useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,
  });

  useEffect(() => {
    const ticket = ticketQuery.data;
    if (!ticket) return;
    router.replace(ticketPath(ticket));
  }, [router, ticketQuery.data]);

  if (ticketQuery.isPending) return <main className="p-6">Loading…</main>;

  const missing =
    ticketQuery.isError &&
    ticketQuery.error instanceof ApiError &&
    ticketQuery.error.status === 404;

  if (ticketQuery.isError && !missing) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Couldn&apos;t load this ticket</h1>
      </main>
    );
  }

  if (missing || !ticketQuery.data) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Ticket not found</h1>
      </main>
    );
  }

  return <main className="p-6">Loading…</main>;
}
