import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is Trackbit?",
    a: "A minimal issue tracker with projects, tickets, statuses and comments. It is a portfolio project built to learn containers and Kubernetes.",
  },
  {
    q: "What can I track?",
    a: "Each ticket has a title, description, status, priority, story points, due date and an assignee, plus a Jira-style ID like WEB-12.",
  },
  {
    q: "Will I get notified?",
    a: "Yes. When someone comments, the API queues a job and a background worker sends an email.",
  },
  {
    q: "Can I invite teammates?",
    a: "Yes. Invite teammates by email from a project's Team page.",
  },
  {
    q: "Is there a mobile app?",
    a: "A React Native app is planned. It will use the same API and sign-in service as the web app.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto flex w-full max-w-3xl scroll-mt-20 flex-col gap-6 px-6 pb-20"
    >
      <h2 id="faq-title" className="text-3xl font-semibold tracking-tight">
        Frequently asked questions
      </h2>
      <div className="border-t">
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0} className="group border-b">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
