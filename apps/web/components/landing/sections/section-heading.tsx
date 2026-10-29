import type { ReactNode } from "react";

export function SectionHeading({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-2">
      <h2 id={id} className="text-3xl font-semibold tracking-tight">
        {title}
      </h2>
      {children && (
        <p className="leading-relaxed text-muted-foreground">{children}</p>
      )}
    </div>
  );
}
