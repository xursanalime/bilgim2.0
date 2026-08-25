-- CreateEnum
CREATE TYPE "RecordingState" AS ENUM ('OFF', 'REQUESTED', 'APPROVED', 'RECORDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "LiveSessionState" AS ENUM ('SCHEDULED', 'PRE_JOIN', 'LIVE', 'ENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "LiveVisibility" AS ENUM ('ENROLLED_ONLY', 'COHORT_ONLY', 'PUBLIC_VIEW_ONLY');

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "lesson_id" UUID,
    "title" TEXT NOT NULL,
    "visibility" "LiveVisibility" NOT NULL DEFAULT 'ENROLLED_ONLY',
    "room_name" TEXT,
    "livekit_room_id" TEXT,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "state" "LiveSessionState" NOT NULL DEFAULT 'SCHEDULED',
    "host_member_id" TEXT,
    "recording_state" "RecordingState" NOT NULL DEFAULT 'OFF',
    "recording_requester_id" TEXT,
    "recording_approver_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_participants" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "joined_at" TIMESTAMPTZ,
    "left_at" TIMESTAMPTZ,
    "duration_sec" INTEGER,
    "acknowledged_recording" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "live_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "egress_id" TEXT,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "durationSec" INTEGER,
    "asset_key" TEXT,
    "retention_days" INTEGER DEFAULT 180,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_sessions_room_name_key" ON "live_sessions"("room_name");

-- CreateIndex
CREATE INDEX "live_sessions_school_id_scheduled_at_idx" ON "live_sessions"("school_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "live_participants_session_id_user_id_key" ON "live_participants"("session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recordings_egress_id_key" ON "recordings"("egress_id");

-- CreateIndex
CREATE INDEX "recordings_school_id_idx" ON "recordings"("school_id");

-- AddForeignKey
ALTER TABLE "live_participants" ADD CONSTRAINT "live_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

