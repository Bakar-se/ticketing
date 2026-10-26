"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateForm } from "@/components/create-form";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type Project = { id: string; name: string };

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const load = () =>
    api<Project[]>("/projects")
      .then(setProjects)
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/signin";
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <CreateForm
        placeholder="New project name"
        submitLabel="Create"
        onSubmit={async (name) => {
          await api("/projects", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
          load();
        }}
      />
      <ul className="space-y-1">
        {projects.map((p) => (
          <li key={p.id}>
            <Link className="underline" href={`/projects/${p.id}`}>
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
