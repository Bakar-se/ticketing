"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, queryKeys } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProjectSettingsDetail = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  archivedAt: string | null;
  role: "OWNER" | "MEMBER";
};

function dateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ProjectSettings() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () =>
      (await api.get<ProjectSettingsDetail>(`/projects/${projectId}`)).data,
  });

  const project = projectQuery.data;
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setTargetDate(dateInput(project.targetDate));
  }, [project]);

  const save = useMutation({
    mutationFn: async (body: {
      name: string;
      description: string | null;
      targetDate: string | null;
    }) => (await api.patch(`/projects/${projectId}`, body)).data,
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
    onError: (caught) => {
      setError(
        caught instanceof ApiError ? caught.message : "Couldn't save those changes.",
      );
    },
  });

  const archive = useMutation({
    mutationFn: async (archived: boolean) =>
      api.patch(`/projects/${projectId}`, { archived }),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    onError: () => setError("Couldn't update the archive state."),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      router.push("/projects");
    },
    onError: () => setError("Couldn't delete this project."),
  });

  if (projectQuery.isPending) return <p>Loading…</p>;
  if (
    projectQuery.isError &&
    projectQuery.error instanceof ApiError &&
    projectQuery.error.status === 404
  ) {
    return <h1 className="text-2xl font-semibold">Project not found</h1>;
  }
  if (!project) {
    return <h1 className="text-2xl font-semibold">Couldn&apos;t load settings</h1>;
  }

  const owner = project.role === "OWNER";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          {owner
            ? "Change this project's details."
            : "Only an Owner can change these details."}
        </p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const next = name.trim();
          if (!next) {
            setError("Name is required.");
            return;
          }
          save.mutate({
            name: next,
            description: description.trim() ? description.trim() : null,
            targetDate: targetDate || null,
          });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="project-name">Name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!owner}
            className="h-10"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-description">Description</Label>
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!owner}
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-target">Target date</Label>
          <Input
            id="project-target"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            disabled={!owner}
            className="h-10"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-key">Key</Label>
          <Input id="project-key" value={project.key} readOnly className="h-10" />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {owner ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-10" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => archive.mutate(project.archivedAt == null)}
            >
              {project.archivedAt ? "Restore" : "Archive"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              onClick={() => setDeleteOpen(true)}
            >
              Delete project
            </Button>
          </div>
        ) : null}
      </form>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              {`This permanently deletes ${project.name}, including its tickets, comments, and team.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              onClick={() => remove.mutate()}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
