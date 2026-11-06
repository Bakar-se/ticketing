import axios, { type AxiosError } from "axios";
import { QueryClient } from "@tanstack/react-query";

type ErrorBody = {
  message?: string | string[];
  issues?: { path: string; message: string }[];
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const { message, issues } = body as ErrorBody;
  const issueText = Array.isArray(issues)
    ? issues.map((issue) => `${issue.path}: ${issue.message}`).join(", ")
    : "";
  const messageText = Array.isArray(message) ? message.join(", ") : message;
  return issueText || messageText || fallback;
}

export const api = axios.create({
  baseURL: "/backend",
  withCredentials: true, // the api reads the session cookie
});

// This module isn't a component, so it can't use the router. QueryProvider
// registers what to do when the session has ended (redirect to sign-in).
let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    const status = error.response?.status ?? 0;
    const message = errorMessage(
      error.response?.data,
      error.response?.statusText || error.message,
    );
    if (status === 401) unauthorizedHandler?.();
    return Promise.reject(new ApiError(status, message));
  },
);

export const queryKeys = {
  projects: ["projects"] as const,
  project: (projectId: string) => ["projects", projectId, "detail"] as const,
  projectTickets: (projectId: string) =>
    ["projects", projectId, "tickets"] as const,
  projectMembers: (projectId: string) =>
    ["projects", projectId, "members"] as const,
  team: (projectId: string) => ["projects", projectId, "team"] as const,
  ticket: (ticketId: string) => ["tickets", ticketId] as const,
  comments: (ticketId: string) => ["tickets", ticketId, "comments"] as const,
};

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}
