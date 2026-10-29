"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Search, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { CreateProjectForm } from "@/components/create-project-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, queryKeys } from "@/lib/api";
import { timeAgo, totalTickets, type Project } from "@/lib/projects";

const SORTS = [
  { value: "updated", label: "Sort by: Last updated" },
  { value: "name", label: "Sort by: Name" },
  { value: "tickets", label: "Sort by: Most tickets" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

export function ProjectsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const removeProject = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      router.refresh();
    },
  });
  const { data: projects } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => (await api.get<Project[]>("/projects")).data,
  });
  const list = projects ?? [];
  const needle = query.trim().toLowerCase();
  const filtered = list.filter((project) => {
    if (!needle) return true;
    return [project.name, project.key, project.description ?? ""].some((value) =>
      value.toLowerCase().includes(needle),
    );
  });
  const visible = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "tickets") return totalTickets(b.counts) - totalTickets(a.counts);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="min-h-svh bg-muted/30">
      <AppHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-muted-foreground">
              Pick a project to open its board.
            </p>
          </div>
          {list.length > 0 && (
            <Button className="h-10" onClick={() => setOpen(true)}>
              New project
            </Button>
          )}
        </div>

        {projects?.length === 0 && (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-md bg-muted">
              <Folder className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Projects group your tickets. Create one to start tracking work on
              its board.
            </p>
            <Button className="mt-4 h-10" onClick={() => setOpen(true)}>
              Create your first project
            </Button>
          </div>
        )}

        {list.length > 0 && (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects..."
                  aria-label="Search projects"
                  className="h-10 pl-8"
                />
              </div>
              <Select
                value={sort}
                onValueChange={(value) => {
                  if (SORTS.some((item) => item.value === value))
                    setSort(value as Sort);
                }}
              >
                <SelectTrigger className="h-10 data-[size=default]:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="min-h-10">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {visible.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">
                {`No projects match "${query.trim()}"`}
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                {visible.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={() => {
                      setDeleteError("");
                      setToDelete(project);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Projects group tickets. The key is used in ticket IDs.
            </DialogDescription>
          </DialogHeader>
          <CreateProjectForm
            key={open ? "open" : "closed"}
            onCreated={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={toDelete !== null}
        onOpenChange={(next) => {
          if (!next) setToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              {`This permanently deletes ${toDelete?.name ?? "this project"} and its tickets.`}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              disabled={removeProject.isPending}
              onClick={async () => {
                if (!toDelete) return;
                setDeleteError("");
                try {
                  await removeProject.mutateAsync(toDelete.id);
                  setToDelete(null);
                } catch {
                  setDeleteError("Something went wrong. Please try again.");
                }
              }}
            >
              {removeProject.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const SEGMENTS = [
  { key: "done", legend: "Done", phrase: "done", className: "bg-primary" },
  {
    key: "inProgress",
    legend: "In progress",
    phrase: "in progress",
    className: "bg-primary/55",
  },
  { key: "todo", legend: "To do", phrase: "to do", className: "bg-primary/20" },
  { key: "backlog", legend: "Backlog", phrase: "backlog", className: "bg-muted" },
] as const;

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: () => void;
}) {
  const counts = project.counts;
  const total = totalTickets(counts);
  const rows = SEGMENTS.map((segment) => ({
    ...segment,
    count: counts[segment.key],
  }));

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold"
        >
          {project.key}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {timeAgo(project.updatedAt)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            aria-label={`Delete ${project.name}`}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <Link href={`/projects/${project.id}`} className="flex flex-col gap-3">
      <div>
        <p className="text-base font-semibold">{project.name}</p>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progress</span>
          <span className="text-muted-foreground">
            {counts.done} of {total} done
          </span>
        </div>
        <div
          role="img"
          aria-label={rows.map((row) => `${row.count} ${row.phrase}`).join(", ")}
          className={`flex h-2 gap-0.5 overflow-hidden rounded-full ${total === 0 ? "bg-muted" : ""}`}
        >
          {rows
            .filter((row) => row.count > 0)
            .map((row) => (
              <div
                key={row.key}
                className={row.className}
                style={{ flex: row.count }}
              />
            ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <span className={`size-2 rounded-sm ${row.className}`} />
              <span>
                {row.legend} {row.count}
              </span>
            </div>
          ))}
        </div>
      </div>
      </Link>
    </article>
  );
}
