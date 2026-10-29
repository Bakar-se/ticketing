import { Columns3, List, MessageSquare } from "lucide-react";
import { SectionHeading } from "./section-heading";

const wrap = "mx-auto w-full max-w-[1120px] px-6";

const features = [
  {
    icon: Columns3,
    title: "Kanban board",
    text: "See every ticket by status and move work from To do to Done at a glance.",
  },
  {
    icon: List,
    title: "Backlog",
    text: "Order tickets by priority, then pull them onto the board when you are ready.",
  },
  {
    icon: MessageSquare,
    title: "Comments and email",
    text: "Discuss on the ticket and get an email when someone comments on your work.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className={`${wrap} flex scroll-mt-20 flex-col gap-8 pb-20`}
    >
      <SectionHeading title="Everything you need, nothing you don't">
        Built around the core of tracking work: projects, tickets, statuses and
        comments.
      </SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex flex-col gap-3 rounded-xl border bg-card p-6"
          >
            <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
              <Icon className="size-5" />
            </span>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
