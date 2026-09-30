-- Parent self-enrolment: pending child claims until office approval

CREATE TYPE "ParentLinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TABLE "parent_students"
  ADD COLUMN "status" "ParentLinkStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by_id" TEXT,
  ADD COLUMN "rejection_reason" TEXT;

CREATE INDEX "parent_students_status_idx" ON "parent_students"("status");

ALTER TABLE "parent_students"
  ADD CONSTRAINT "parent_students_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
