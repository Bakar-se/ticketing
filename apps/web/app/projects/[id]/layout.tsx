import { Suspense } from "react";
import { ProjectShell } from "@/components/project-shell";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-background" />}>
      <ProjectShell>{children}</ProjectShell>
    </Suspense>
  );
}
