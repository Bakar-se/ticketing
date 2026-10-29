const wrap = "mx-auto w-full max-w-[1120px] px-6";

const stack = [
  "Next.js",
  "NestJS",
  "Better Auth",
  "PostgreSQL",
  "Redis",
  "BullMQ",
  "Docker",
  "kubernetes",
];

export function BuiltWith() {
  return (
    <section
      aria-label="Built with"
      className={`${wrap} flex flex-col items-center gap-4 pb-20 text-center`}
    >
      <span className="text-sm text-muted-foreground">
        A portfolio project built to learn containers and orchestration, using
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {stack.map((s) => (
          <span
            key={s}
            className="rounded-full border bg-card px-3 py-1.5 text-[13px] font-medium"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}
