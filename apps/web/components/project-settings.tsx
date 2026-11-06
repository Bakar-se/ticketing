"use client";

import { useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, api, queryKeys } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const generalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or less"),
  description: z.string().trim().max(2000, "Must be 2000 characters or less"),
  targetDate: z.string(),
});
type GeneralValues = z.infer<typeof generalSchema>;

function generalValues(project: ProjectSettingsDetail): GeneralValues {
  return {
    name: project.name,
    description: project.description ?? "",
    targetDate: project.targetDate ? project.targetDate.slice(0, 10) : "",
  };
}

export function ProjectSettings() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () =>
      (await api.get<ProjectSettingsDetail>(`/projects/${projectId}`)).data,
  });

  const project = projectQuery.data;
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
  // Settings are for Owners only; anyone else gets the same answer as a missing page
  if (project.role !== "OWNER") return notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage this project.</p>
      </div>
      <GeneralCard project={project} />
      <ProjectActions project={project} />
    </div>
  );
}

function GeneralCard({ project }: { project: ProjectSettingsDetail }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: generalValues(project),
  });

  const save = useMutation({
    mutationFn: async (values: GeneralValues) =>
      (
        await api.patch<ProjectSettingsDetail>(`/projects/${project.id}`, {
          name: values.name,
          description: values.description ? values.description : null,
          targetDate: values.targetDate || null,
        })
      ).data,
  });

  async function onSubmit(values: GeneralValues) {
    setServerError("");
    try {
      await save.mutateAsync(values);
      // The saved values become the new baseline, so Save goes quiet again
      reset(values);
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    } catch (caught) {
      setServerError(
        caught instanceof ApiError ? caught.message : "Couldn't save those changes.",
      );
    }
  }

  const clearSavedOnChange = { onChange: () => setSaved(false) };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              className="h-10"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "project-name-error" : undefined}
              {...register("name", clearSavedOnChange)}
            />
            {errors.name && (
              <p id="project-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-key">Project key</Label>
            <Input
              id="project-key"
              value={project.key}
              disabled
              readOnly
              className="h-10"
              aria-describedby="project-key-help"
            />
            <p id="project-key-help" className="text-xs text-muted-foreground">
              {`Used in ticket IDs, like ${project.key}-12. It can't be changed after the project is created.`}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <textarea
              id="project-description"
              rows={4}
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "project-description-error" : undefined
              }
              className="min-h-[88px] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
              {...register("description", clearSavedOnChange)}
            />
            {errors.description && (
              <p id="project-description-error" className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-target">Target date</Label>
            <Input
              id="project-target"
              type="date"
              className="h-10 w-fit"
              {...register("targetDate", clearSavedOnChange)}
            />
          </div>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            {saved && !isDirty && (
              <p role="status" className="text-sm text-muted-foreground">
                Saved
              </p>
            )}
            <Button type="submit" className="h-10" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Archive and delete move into the danger card in #8; until then they sit below General
function ProjectActions({ project }: { project: ProjectSettingsDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const archive = useMutation({
    mutationFn: async (archived: boolean) =>
      api.patch(`/projects/${project.id}`, { archived }),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    onError: () => setError("Couldn't update the archive state."),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/projects/${project.id}`),
    onSuccess: () => {
      router.push("/projects");
    },
    onError: () => setError("Couldn't delete this project."),
  });

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
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
