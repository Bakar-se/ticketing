import { Suspense } from "react";
import { ProjectView } from "../../../components/project-view";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-6">Loading…</main>}>
      <ProjectView />
    </Suspense>
  );
}