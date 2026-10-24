-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable: new columns. "key" and "number" start nullable so existing rows can be backfilled.
ALTER TABLE "Project"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "key" TEXT,
  ADD COLUMN "targetDate" DATE,
  ADD COLUMN "ticketCounter" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Ticket"
  ADD COLUMN "dueDate" DATE,
  ADD COLUMN "number" INTEGER,
  ADD COLUMN "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "storyPoints" INTEGER,
  ALTER COLUMN "status" SET DEFAULT 'BACKLOG';

-- Backfill project keys: first letters of the name (at least 2, else 'PRJ'),
-- made unique with a numeric suffix (WEB, WEB2, ...)
WITH base AS (
  SELECT id,
         "createdAt",
         CASE WHEN length(regexp_replace(upper(name), '[^A-Z]', '', 'g')) >= 2
              THEN left(regexp_replace(upper(name), '[^A-Z]', '', 'g'), 3)
              ELSE 'PRJ' END AS k
  FROM "Project"
),
ranked AS (
  SELECT id, k, row_number() OVER (PARTITION BY k ORDER BY "createdAt", id) AS rn
  FROM base
)
UPDATE "Project" p
SET "key" = CASE WHEN r.rn = 1 THEN r.k ELSE r.k || r.rn END
FROM ranked r
WHERE p.id = r.id;

-- Backfill ticket numbers per project, oldest first
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY "projectId" ORDER BY "createdAt", id) AS n
  FROM "Ticket"
)
UPDATE "Ticket" t SET "number" = numbered.n FROM numbered WHERE t.id = numbered.id;

-- The counter continues from the highest number in use
UPDATE "Project" p
SET "ticketCounter" = COALESCE((SELECT max(t."number") FROM "Ticket" t WHERE t."projectId" = p.id), 0);

-- Now that every row has a value, make the columns required
ALTER TABLE "Project" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");
CREATE INDEX "Ticket_projectId_status_idx" ON "Ticket"("projectId", "status");
CREATE UNIQUE INDEX "Ticket_projectId_number_key" ON "Ticket"("projectId", "number");
