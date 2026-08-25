-- CreateEnum
CREATE TYPE "GamificationProfileState" AS ENUM ('ACTIVE', 'FROZEN', 'ARCHIVED');

-- CreateTable
CREATE TABLE "student_gamification_profiles" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_member_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "state" "GamificationProfileState" NOT NULL DEFAULT 'ACTIVE',
    "lifetime_xp" INTEGER NOT NULL DEFAULT 0,
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "last_qualifying_date" TIMESTAMPTZ,
    "leaderboard_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "leaderboardAlias" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_gamification_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "source_entity" TEXT,
    "source_id" TEXT,
    "actor_member_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_days" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "icon_key" TEXT,
    "criterion_json" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_badges" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "awarded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "source_ref" TEXT,

    CONSTRAINT "student_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_gamification_profiles_user_id_idx" ON "student_gamification_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_gamification_profiles_school_id_student_member_id_key" ON "student_gamification_profiles"("school_id", "student_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_idempotency_key_key" ON "xp_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "xp_events_profile_id_occurred_at_idx" ON "xp_events"("profile_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "streak_days_profile_id_local_date_key" ON "streak_days"("profile_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "badges_school_id_key_version_key" ON "badges"("school_id", "key", "version");

-- CreateIndex
CREATE INDEX "student_badges_profile_id_idx" ON "student_badges"("profile_id");

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_gamification_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_days" ADD CONSTRAINT "streak_days_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_gamification_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_gamification_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

