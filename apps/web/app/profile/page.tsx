import { Suspense } from "react";
import { ProfileGeneral } from "@/components/profile-general";

export default function ProfilePage() {
  // ProfileGeneral reads the query string (?verified=1), which needs a Suspense boundary
  return (
    <Suspense fallback={<div className="min-h-svh bg-muted/30" />}>
      <ProfileGeneral />
    </Suspense>
  );
}
