import { SectionHeading } from "./section-heading";

const wrap = "mx-auto w-full max-w-[1120px] px-6";

const steps = [
  {
    title: "Create a project",
    text: "Give it a name and a short key, like WEB. Every ticket ID starts with it.",
  },
  {
    title: "Fill the backlog",
    text: "Add tickets with a priority, story points and a due date, then order them.",
  },
  {
    title: "Move work across the board",
    text: "Drag tickets from To do to Done and discuss them in comments.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className={`${wrap} flex scroll-mt-20 flex-col gap-8 pb-20`}
    >
      <SectionHeading title="How it works">
        From an empty project to shipped work in three steps.
      </SectionHeading>
      <div className="grid gap-8 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="flex flex-col gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {s.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
