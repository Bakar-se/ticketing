"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { api, queryKeys } from "@/lib/api";

type DeletableProject = { id: string; name: string };

// Deleting can't be undone, so the Owner types the project's name first.
// `project` null means closed.
export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: DeletableProject | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  return (
    <Dialog
      open={project !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        {/* Keyed so a fresh confirmation starts for each project */}
        {project && (
          <ConfirmDelete
            key={project.id}
            project={project}
            onClose={onClose}
            onDeleted={onDeleted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDelete({
  project,
  onClose,
  onDeleted,
}: {
  project: DeletableProject;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const remove = useMutation({
    mutationFn: () => api.delete(`/projects/${project.id}`),
    onSuccess: () => {
      // Drop the deleted project's own data (detail, tickets, team) rather than
      // refetching it into a 404 while the page is still on screen. Once it's
      // gone, refreshing everything under "projects" only reaches the lists.
      queryClient.removeQueries({ queryKey: ["projects", project.id] });
      onDeleted();
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    onError: () => setError("Couldn't delete this project."),
  });
  const confirmed = typed.trim() === project.name;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!confirmed || remove.isPending) return;
        setError("");
        remove.mutate();
      }}
    >
      <DialogHeader>
        <DialogTitle>{`Delete ${project.name}?`}</DialogTitle>
        <DialogDescription>
          This permanently deletes the project and all of its tickets and comments.
          This can&apos;t be undone.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="delete-project-confirm">Type the project name to confirm</Label>
        <Input
          id="delete-project-confirm"
          autoComplete="off"
          placeholder={project.name}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="h-10"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          className="h-10"
          disabled={!confirmed || remove.isPending}
        >
          {remove.isPending ? "Deleting..." : "Delete project"}
        </Button>
      </div>
    </form>
  );
}
