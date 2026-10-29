import type { ReactNode } from "react";
import { PriorityBadge } from "@/components/landing/hero";

const wrap = "mx-auto w-full max-w-[1120px] px-6";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-muted/40 p-3 shadow-xl shadow-black/5">
      {children}
    </div>
  );
}

function ProjectsShot() {
  const cards = [
    { key: "WEB", name: "Web app", done: 6, parts: [6, 2, 3, 5] },
    { key: "API", name: "Backend API", done: 9, parts: [9, 2, 2, 3] },
  ];
  const cls = ["bg-primary", "bg-primary/55", "bg-primary/20", "bg-muted"];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex flex-col gap-2.5 rounded-xl border bg-card p-4"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
              {c.key}
            </span>
            <span className="text-sm font-semibold">{c.name}</span>
          </div>
          <div
            role="img"
            aria-label={`${c.done} of 16 done`}
            className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
          >
            {c.parts.map((p, i) => (
              <div key={i} className={cls[i]} style={{ flex: p }} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {c.done} of 16 done
          </span>
        </div>
      ))}
    </div>
  );
}

function BacklogShot() {
  const rows = [
    { id: "WEB-20", title: "Storybook for components", p: "High", pts: 3 },
    { id: "WEB-21", title: "Project settings page", p: "Medium", pts: 5 },
    { id: "WEB-22", title: "Team members list", p: "Low", pts: 3 },
  ] as const;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex min-h-11 items-center gap-2 bg-muted/50 px-3 text-sm font-semibold">
        Backlog{" "}
        <span className="rounded-full bg-muted px-2 text-xs font-normal">
          3 tickets
        </span>
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex min-h-12 items-center gap-3 border-t px-3"
        >
          <span className="w-14 text-xs font-medium text-muted-foreground">
            {r.id}
          </span>
          <span className="flex-1 text-sm font-medium">{r.title}</span>
          <PriorityBadge level={r.p} />
          <span className="text-xs text-muted-foreground">{r.pts} pts</span>
        </div>
      ))}
    </div>
  );
}

function TicketShot() {
  const comments = [
    { i: "SK", n: "Sam Kim", t: "Started on the layout." },
    { i: "AD", n: "Alex Doe", t: "Should the reporter get an email?" },
  ];
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          WEB-12
        </span>
        <span className="text-lg font-semibold">
          Ticket detail view with comments
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 text-xs">
            In progress
          </span>
          <PriorityBadge level="High" />
          <span className="text-xs text-muted-foreground">
            5 pts · Due Oct 27
          </span>
        </div>
      </div>
      {comments.map((c) => (
        <div key={c.n} className="flex gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold">
            {c.i}
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">{c.n}</span>
            <span className="text-sm">{c.t}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TourRow({
  title,
  text,
  children,
  reverse,
}: {
  title: string;
  text: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_1.3fr] md:gap-12">
      <div className={`flex flex-col gap-3 ${reverse ? "md:order-2" : ""}`}>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="leading-relaxed text-muted-foreground">{text}</p>
      </div>
      <Frame>{children}</Frame>
    </div>
  );
}

export function Tour() {
  return (
    <section
      aria-label="Product tour"
      className={`${wrap} flex flex-col gap-16 pb-20`}
    >
      <TourRow
        title="See every project at a glance"
        text="Each project card shows its progress across Backlog, To do, In progress and Done."
      >
        <ProjectsShot />
      </TourRow>
      <TourRow
        reverse
        title="Keep the backlog in order"
        text="Prioritize tickets with a priority, story points and due date before they reach the board."
      >
        <BacklogShot />
      </TourRow>
      <TourRow
        title="Talk about work on the ticket"
        text="Details and comments live together, so context never gets lost."
      >
        <TicketShot />
      </TourRow>
    </section>
  );
}
