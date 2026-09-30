-- Multi-device sessions -------------------------------------------------------
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The single-device hash is replaced by refresh_tokens.
ALTER TABLE "users" DROP COLUMN IF EXISTS "refresh_token_hash";

-- One-time tokens are looked up by value.
CREATE INDEX IF NOT EXISTS "otp_tokens_token_idx" ON "otp_tokens"("token");

-- Payment integrity -------------------------------------------------------------
-- A family can hold only one open charge per pupil per fee item. Expired, failed,
-- cancelled, or paid rows do not block a fresh control number.
CREATE UNIQUE INDEX IF NOT EXISTS "payments_one_open_per_charge"
    ON "payments" ("parent_id", "student_id", "fee_item_id")
    WHERE "status" IN ('PENDING', 'CONTROL_NUMBER_GENERATED', 'PAYMENT_INITIATED');

-- A bank or mobile-money receipt reference can settle one payment only.
CREATE UNIQUE INDEX IF NOT EXISTS "payments_transaction_ref_unique"
    ON "payments" ("transaction_ref")
    WHERE "transaction_ref" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "payments_status_deadline_idx" ON "payments"("status", "deadline");

CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "control_number" TEXT,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "outcome" TEXT,
    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_webhook_events_provider_event_id_key"
    ON "payment_webhook_events"("provider", "event_id");
CREATE INDEX "payment_webhook_events_control_number_idx"
    ON "payment_webhook_events"("control_number");

-- Search ------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "announcements_title_trgm" ON "announcements" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "announcements_description_trgm" ON "announcements" USING gin ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "events_title_trgm" ON "events" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "documents_title_trgm" ON "documents" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ai_faqs_question_trgm" ON "ai_faqs" USING gin ("question" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "students_last_name_trgm" ON "students" USING gin ("last_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "students_first_name_trgm" ON "students" USING gin ("first_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_last_name_trgm" ON "users" USING gin ("last_name" gin_trgm_ops);

-- Housekeeping helpers ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "notifications_is_read_created_at_idx" ON "notifications"("is_read", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
