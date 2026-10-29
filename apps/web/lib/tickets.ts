export const TICKET_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const BOARD_COLUMNS = [
  { status: "TODO", label: "To do" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "DONE", label: "Done" },
] as const;
export type BoardStatus = (typeof BOARD_COLUMNS)[number]["status"];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const STORY_POINTS = [1, 2, 3, 5, 8, 13] as const;

export const STATUS_LABEL: Record<TicketStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type Ticket = {
  id: string;
  ticketKey: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  storyPoints: number | null;
  dueDate: string | null;
  projectId: string;
};

export function isBoardStatus(status: string): status is BoardStatus {
  return BOARD_COLUMNS.some((column) => column.status === status);
}

export function formatDue(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function ticketMeta(ticket: Pick<Ticket, "storyPoints" | "dueDate">) {
  const parts: string[] = [];
  if (ticket.storyPoints != null) {
    parts.push(
      `${ticket.storyPoints} ${ticket.storyPoints === 1 ? "pt" : "pts"}`,
    );
  }
  const due = formatDue(ticket.dueDate);
  if (due) parts.push(`Due ${due}`);
  return parts.join(" · ");
}
