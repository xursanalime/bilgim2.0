-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Enable citext (used by @db.Citext)
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SchoolMemberRole" AS ENUM ('OWNER', 'TEACHER', 'ASSISTANT', 'MODERATOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "SchoolMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SchoolDomainKind" AS ENUM ('PLATFORM_SUBDOMAIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LandingTemplate" AS ENUM ('CLASSIC', 'MINIMAL', 'BOLD');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('NONE', 'PENDING', 'GRANTED', 'REVOKED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_asset_id" UUID,
    "locale" TEXT NOT NULL DEFAULT 'uz',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "sessions_revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "slug" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SchoolStatus" NOT NULL DEFAULT 'DRAFT',
    "owner_user_id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "default_locale" TEXT NOT NULL DEFAULT 'uz',
    "brand_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_holidays" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "title" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "school_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_members" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "SchoolMemberRole" NOT NULL,
    "status" "SchoolMemberStatus" NOT NULL DEFAULT 'INVITED',
    "invited_by" UUID,
    "joined_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "school_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_school_summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "next_lesson_at" TIMESTAMPTZ,
    "unread_message_count" INTEGER NOT NULL DEFAULT 0,
    "membership_version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_school_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_invitations" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "target_email" TEXT NOT NULL,
    "role" "SchoolMemberRole" NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_domains" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "hostname" CITEXT NOT NULL,
    "kind" "SchoolDomainKind" NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_landing_pages" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "template" "LandingTemplate" NOT NULL DEFAULT 'CLASSIC',
    "hero" JSONB,
    "faq" JSONB,
    "contact" JSONB,
    "seo" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_version" INTEGER,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "school_landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_highlights" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "icon_key" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "landing_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_success_stories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metric_label" TEXT,
    "metric_value" TEXT,
    "student_alias" TEXT NOT NULL,
    "consent_status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consented_at" TIMESTAMPTZ,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "landing_success_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_testimonials" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "author_user_id" UUID,
    "display_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "course_label" TEXT,
    "consent_status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consented_at" TIMESTAMPTZ,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "landing_testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "prev" JSONB,
    "next" JSONB,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "device_label" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "schools_slug_key" ON "schools"("slug");

-- CreateIndex
CREATE INDEX "schools_owner_user_id_idx" ON "schools"("owner_user_id");

-- CreateIndex
CREATE INDEX "school_holidays_school_id_idx" ON "school_holidays"("school_id");

-- CreateIndex
CREATE INDEX "school_members_user_id_status_idx" ON "school_members"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "school_members_school_id_user_id_key" ON "school_members"("school_id", "user_id");

-- CreateIndex
CREATE INDEX "member_school_summaries_user_id_idx" ON "member_school_summaries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_school_summaries_user_id_school_id_key" ON "member_school_summaries"("user_id", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_invitations_token_hash_key" ON "school_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "school_invitations_school_id_idx" ON "school_invitations"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_domains_hostname_key" ON "school_domains"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "school_landing_pages_school_id_key" ON "school_landing_pages"("school_id");

-- CreateIndex
CREATE INDEX "landing_highlights_school_id_idx" ON "landing_highlights"("school_id");

-- CreateIndex
CREATE INDEX "landing_success_stories_school_id_idx" ON "landing_success_stories"("school_id");

-- CreateIndex
CREATE INDEX "landing_testimonials_school_id_is_published_idx" ON "landing_testimonials"("school_id", "is_published");

-- CreateIndex
CREATE INDEX "audit_events_school_id_created_at_idx" ON "audit_events"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_holidays" ADD CONSTRAINT "school_holidays_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_members" ADD CONSTRAINT "school_members_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_members" ADD CONSTRAINT "school_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_invitations" ADD CONSTRAINT "school_invitations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_domains" ADD CONSTRAINT "school_domains_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_landing_pages" ADD CONSTRAINT "school_landing_pages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_highlights" ADD CONSTRAINT "landing_highlights_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_success_stories" ADD CONSTRAINT "landing_success_stories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_testimonials" ADD CONSTRAINT "landing_testimonials_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_testimonials" ADD CONSTRAINT "landing_testimonials_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

