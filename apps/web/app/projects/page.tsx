import { Suspense } from "react";
import { ProjectsScreen } from "@/components/projects-screen";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-muted/30" />}>
      <ProjectsScreen />
    </Suspense>
  );
}
