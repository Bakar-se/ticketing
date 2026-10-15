import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./lib/auth";

const app = new Hono();

// CORS must be registered before the auth routes
app.use(
  "/api/auth/*",
  cors({
    origin: process.env.WEB_ORIGIN!,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true, // lets the browser send and receive the session cookie
  }),
);

// Better Auth handles everything under /api/auth/*
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Not used yet, but Docker healthchecks and K8s probes will hit this
app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT ?? 4001);
serve({ fetch: app.fetch, port });
console.log(`auth listening on :${port}`);
