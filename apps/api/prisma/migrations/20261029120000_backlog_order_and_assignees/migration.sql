-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "assigneeId" TEXT,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill order within each status so existing tickets do not all share position 0.
WITH ranked AS (
  SELECT id,
         (row_number() OVER (PARTITION BY "projectId", "status" ORDER BY "number", id) - 1) AS pos
  FROM "Ticket"
)
UPDATE "Ticket" t
SET "position" = ranked.pos
FROM ranked
WHERE t.id = ranked.id;

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Ticket_projectId_status_position_idx" ON "Ticket"("projectId", "status", "position");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
