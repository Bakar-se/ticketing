import { Suspense } from "react";
import { TicketView } from "../../../components/ticket-view";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-6">Loading…</main>}>
      <TicketView />
    </Suspense>
  );
}