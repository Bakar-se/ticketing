# Trackbit

A small Jira-like app for projects, tickets, and comments, used as a vehicle to learn Docker and Kubernetes from local Compose through a k3s cluster.

## What it does

- Sign up and sign in with email and password
- Create projects, tickets (`TODO`, `IN_PROGRESS`, `DONE`), and comments
- Email the ticket owner when a ticket is created or a comment is added

## Services

| App | Role |
| --- | --- |
| `web` | Next.js UI |
| `api` | NestJS REST API (projects, tickets, comments) |
| `auth` | Hono + Better Auth |
| `notifications` | BullMQ worker that sends mail via Nodemailer |

Postgres stores users (auth) and tickets (api) in separate databases. Redis is the job queue. Mailpit catches notification email in development.