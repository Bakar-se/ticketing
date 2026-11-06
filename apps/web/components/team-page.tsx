"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ApiError, api, queryKeys } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "OWNER" | "MEMBER";

type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
};

type TeamInvite = {
  id: string;
  email: string;
  sentAt: string;
  expiresAt: string;
  sendFailed: boolean;
};

type Team = {
  members: TeamMember[];
  invites: TeamInvite[];
};

type ProjectDetail = {
  id: string;
  name: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function TeamPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const me = session?.user?.id;
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirm, setConfirm] = useState<
    { kind: "remove"; userId: string; name: string } | { kind: "leave" } | null
  >(null);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () =>
      (await api.get<ProjectDetail>(`/projects/${projectId}`)).data,
  });
  const teamQuery = useQuery({
    queryKey: queryKeys.team(projectId),
    queryFn: async () =>
      (await api.get<Team>(`/projects/${projectId}/team`)).data,
  });

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.team(projectId) });
  }

  const sendInvite = useMutation({
    mutationFn: async (address: string) =>
      (await api.post(`/projects/${projectId}/invites`, { email: address })).data,
    onSuccess: async () => {
      setInviteOpen(false);
      setEmail("");
      setInviteError("");
      await refresh();
    },
    onError: (error) => {
      setInviteError(
        error instanceof ApiError ? error.message : "Couldn't send that invite.",
      );
    },
  });

  const resend = useMutation({
    mutationFn: async (inviteId: string) =>
      api.post(`/projects/${projectId}/invites/${inviteId}/resend`),
    onSuccess: () => refresh(),
    onError: () => setActionError("Couldn't resend that invite."),
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) =>
      api.delete(`/projects/${projectId}/invites/${inviteId}`),
    onSuccess: () => refresh(),
    onError: () => setActionError("Couldn't cancel that invite."),
  });

  const setRole = useMutation({
    mutationFn: async (input: { userId: string; role: Role }) =>
      api.patch(`/projects/${projectId}/members/${input.userId}`, {
        role: input.role,
      }),
    onSuccess: () => refresh(),
    onError: (error) => {
      setActionError(
        error instanceof ApiError ? error.message : "Couldn't change that role.",
      );
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) =>
      api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: async () => {
      setConfirm(null);
      await refresh();
    },
    onError: (error) => {
      setActionError(
        error instanceof ApiError ? error.message : "Couldn't remove that member.",
      );
    },
  });

  const leave = useMutation({
    mutationFn: async () => api.post(`/projects/${projectId}/leave`),
    onSuccess: () => {
      router.push("/projects");
    },
    onError: (error) => {
      setConfirm(null);
      setActionError(
        error instanceof ApiError ? error.message : "Couldn't leave this project.",
      );
    },
  });

  if (projectQuery.isPending || teamQuery.isPending) return <p>Loading…</p>;
  if (
    (projectQuery.isError &&
      projectQuery.error instanceof ApiError &&
      projectQuery.error.status === 404) ||
    (teamQuery.isError &&
      teamQuery.error instanceof ApiError &&
      teamQuery.error.status === 404)
  ) {
    return <h1 className="text-2xl font-semibold">Project not found</h1>;
  }
  if (!projectQuery.data || !teamQuery.data) {
    return <h1 className="text-2xl font-semibold">Couldn&apos;t load this team</h1>;
  }

  const team = teamQuery.data;
  const project = projectQuery.data;
  const mine = team.members.find((member) => member.userId === me);
  const isOwner = mine?.role === "OWNER";
  const ownerCount = team.members.filter((member) => member.role === "OWNER").length;
  const needle = debouncedQuery.trim().toLowerCase();
  const members = team.members.filter((member) => {
    if (!needle) return true;
    return (
      member.name.toLowerCase().includes(needle) ||
      member.email.toLowerCase().includes(needle)
    );
  });
  const invites = team.invites.filter((invite) => {
    if (!needle) return true;
    return invite.email.toLowerCase().includes(needle);
  });
  const now = Date.now();

  function submitInvite() {
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      setInviteError("Enter a valid email");
      return;
    }
    setInviteError("");
    sendInvite.mutate(address);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            {`People with access to ${project.name}.`}
          </p>
        </div>
        {isOwner ? (
          <Button className="h-10" onClick={() => {
            setInviteError("");
            setEmail("");
            setInviteOpen(true);
          }}>
            Invite member
          </Button>
        ) : null}
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search members..."
        aria-label="Search members"
        className="h-10 max-w-sm"
      />

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {needle && members.length + invites.length === 0 ? (
        <p className="text-muted-foreground">No matches.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Member</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="w-12 px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const self = member.userId === me;
              const lastOwner = member.role === "OWNER" && ownerCount <= 1;
              const actions = isOwner
                ? [
                    !self && member.role === "MEMBER"
                      ? { id: "owner", label: "Make owner" }
                      : null,
                    !self && member.role === "OWNER" && !lastOwner
                      ? { id: "member", label: "Make member" }
                      : null,
                    !self && !lastOwner ? { id: "remove", label: "Remove" } : null,
                    self && !lastOwner ? { id: "leave", label: "Leave" } : null,
                  ].filter((item) => item !== null)
                : self
                  ? [{ id: "leave", label: "Leave" }]
                  : [];
              return (
                <tr key={member.userId} className="border-b">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {initials(member.name)}
                      </span>
                      <span>
                        <span className="block font-medium">{member.name}</span>
                        <span className="block text-muted-foreground">
                          {member.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                      {member.role === "OWNER" ? "Owner" : "Member"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {formatDay(member.joinedAt)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {actions.length > 0 ? (
                      <RowMenu label={`Actions for ${member.name}`}>
                        {actions.map((action) => (
                          <DropdownMenuItem
                            key={action.id}
                            className="min-h-10"
                            variant={action.id === "remove" ? "destructive" : "default"}
                            onClick={() => {
                              setActionError("");
                              if (action.id === "owner") {
                                setRole.mutate({ userId: member.userId, role: "OWNER" });
                              } else if (action.id === "member") {
                                setRole.mutate({ userId: member.userId, role: "MEMBER" });
                              } else if (action.id === "remove") {
                                setConfirm({
                                  kind: "remove",
                                  userId: member.userId,
                                  name: member.name,
                                });
                              } else {
                                setConfirm({ kind: "leave" });
                              }
                            }}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </RowMenu>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {invites.map((invite) => {
              const expired = new Date(invite.expiresAt).getTime() <= now;
              return (
                <tr key={invite.id} className="border-b">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="size-8 shrink-0 rounded-full border border-dashed" />
                      <span>
                        <span className="block font-medium">{invite.email}</span>
                        <span className="block text-muted-foreground">
                          {invite.sendFailed
                            ? "Couldn't send email"
                            : `Invite sent ${formatDay(invite.sentAt)}`}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline">{expired ? "Expired" : "Pending"}</Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">-</td>
                  <td className="px-3 py-3 text-right">
                    {isOwner ? (
                      <RowMenu label={`Actions for ${invite.email}`}>
                        <DropdownMenuItem
                          className="min-h-10"
                          onClick={() => {
                            setActionError("");
                            resend.mutate(invite.id);
                          }}
                        >
                          Resend
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="min-h-10"
                          variant="destructive"
                          onClick={() => {
                            setActionError("");
                            cancelInvite.mutate(invite.id);
                          }}
                        >
                          Cancel
                        </DropdownMenuItem>
                      </RowMenu>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              They become a Member when they sign in with this email.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitInvite();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="text"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={!!inviteError}
                className="h-10"
              />
            </div>
            {inviteError ? (
              <p role="alert" className="text-sm text-destructive">
                {inviteError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-10" disabled={sendInvite.isPending}>
                {sendInvite.isPending ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === "leave" ? "Leave project" : "Remove member"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === "leave"
                ? "You will lose access. Tickets assigned to you will become unassigned."
                : `${confirm?.name ?? "This member"} will lose access. Tickets assigned to them will become unassigned.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "leave") leave.mutate();
                else removeMember.mutate(confirm.userId);
              }}
            >
              {confirm?.kind === "leave" ? "Leave" : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
