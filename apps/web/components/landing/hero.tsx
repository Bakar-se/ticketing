import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-12 pt-20 text-center">
      <span className="rounded-full border bg-muted/40 px-3 py-1 text-[13px] text-muted-foreground">
        Simple issue tracking for small teams
      </span>
      <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Track work from backlog to done.
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Projects, tickets, boards and comments in one fast, minimal workspace.
        No sprints to configure and no clutter.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/signup"
          className={buttonVariants({ className: "h-11 px-5" })}
        >
          Get started
        </Link>
        <Link
          href="/signin"
          className={buttonVariants({
            variant: "outline",
            className: "h-11 px-5",
          })}
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}

const PRIORITY = {
  High: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Low: "bg-muted text-muted-foreground",
} as const;

export function PriorityBadge({ level }: { level: keyof typeof PRIORITY }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY[level]}`}
    >
      {level}
    </span>
  );
}

type Card = { id: string; title: string; priority: keyof typeof PRIORITY };
const columns: { name: string; cards: Card[] }[] = [
  {
    name: "To do",
    cards: [
      {
        id: "WEB-14",
        title: "Add search to projects list",
        priority: "Medium",
      },
      { id: "WEB-15", title: "Profile form validation", priority: "Low" },
    ],
  },
  {
    name: "In progress",
    cards: [
      {
        id: "WEB-11",
        title: "Drag and drop between columns",
        priority: "High",
      },
      { id: "WEB-12", title: "Ticket detail with comments", priority: "High" },
    ],
  },
  {
    name: "Done",
    cards: [
      { id: "WEB-08", title: "Sign in page layout", priority: "Medium" },
      { id: "WEB-09", title: "Sign up page", priority: "Low" },
    ],
  },
];

export function BoardPreview() {
  return (
    <section
      aria-label="Product preview"
      className="mx-auto w-full max-w-[1040px] px-6 pb-20"
    >
      <div className="rounded-2xl border bg-muted/40 p-3 shadow-xl shadow-black/5">
        <div className="flex items-center gap-2 px-2 pb-3 pt-1">
          <span className="rounded-md border bg-background px-2 py-0.5 text-xs font-semibold">
            WEB
          </span>
          <span className="text-sm font-medium">Web app / Board</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {columns.map((col) => (
            <div
              key={col.name}
              className="flex flex-col gap-2.5 rounded-xl bg-muted p-3"
            >
              <span className="px-1 text-sm font-medium">{col.name}</span>
              {col.cards.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {c.id}
                    </span>
                    <PriorityBadge level={c.priority} />
                  </div>
                  <span className="text-sm font-medium leading-snug">
                    {c.title}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
