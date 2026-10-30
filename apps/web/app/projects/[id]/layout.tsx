import { Suspense } from "react";
import { ProjectShell } from "@/components/project-shell";
import { TicketChromeProvider } from "@/components/ticket-chrome";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-background" />}>
      <TicketChromeProvider>
        <ProjectShell>{children}</ProjectShell>
      </TicketChromeProvider>
    </Suspense>
  );
}
