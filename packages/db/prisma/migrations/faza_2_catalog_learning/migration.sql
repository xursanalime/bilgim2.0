-- CreateEnum
CREATE TYPE "CourseVisibility" AS ENUM ('DRAFT', 'PUBLIC', 'UNLISTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'LIVE', 'HYBRID', 'TEXT', 'QUIZ');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FULL', 'CANCELLED', 'ENDED');

-- CreateEnum
CREATE TYPE "PriceBillingModel" AS ENUM ('FREE', 'ONE_TIME', 'INSTALLMENT', 'RECURRING_MEMBERSHIP');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'REVOKED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EnrollmentAccessSource" AS ENUM ('ORDER', 'MEMBERSHIP', 'MANUAL', 'INVITE');

-- CreateEnum
CREATE TYPE "LockedReason" AS ENUM ('NOT_STARTED', 'DRIP', 'PREVIOUS_INCOMPLETE', 'MEMBERSHIP_PAST_DUE', 'ENROLLMENT_REVOKED', 'PLAN_LIMIT');

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "cover_asset_id" UUID,
    "visibility" "CourseVisibility" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_sections" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "section_id" UUID,
    "slug" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL,
    "content_json" JSONB,
    "estimated_minutes" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "capacity" INTEGER,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "status" "CohortStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "CourseVisibility" NOT NULL DEFAULT 'UNLISTED',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_teachers" (
    "id" UUID NOT NULL,
    "cohort_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TEACHER',

    CONSTRAINT "cohort_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_offers" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "sellable_type" TEXT NOT NULL,
    "sellable_id" TEXT,
    "cohort_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "billing_model" "PriceBillingModel" NOT NULL,
    "price_uzs" INTEGER NOT NULL,
    "interval_days" INTEGER,
    "trial_days" INTEGER,
    "enrollment_approval" BOOLEAN NOT NULL DEFAULT true,
    "availability" TEXT NOT NULL DEFAULT 'OPEN',
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "cohort_id" UUID,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "access_source" "EnrollmentAccessSource" NOT NULL DEFAULT 'MANUAL',
    "offerVersion" INTEGER,
    "activated_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_access" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "available_at" TIMESTAMPTZ,
    "locked_reason" "LockedReason",
    "completed_at" TIMESTAMPTZ,
    "last_position_seconds" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lesson_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress_events" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "source_key" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_school_id_visibility_idx" ON "courses"("school_id", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "courses_school_id_slug_key" ON "courses"("school_id", "slug");

-- CreateIndex
CREATE INDEX "course_sections_course_id_idx" ON "course_sections"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_sections_course_id_position_key" ON "course_sections"("course_id", "position");

-- CreateIndex
CREATE INDEX "lessons_school_id_idx" ON "lessons"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_course_id_slug_key" ON "lessons"("course_id", "slug");

-- CreateIndex
CREATE INDEX "cohorts_school_id_course_id_idx" ON "cohorts"("school_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_teachers_cohort_id_member_id_key" ON "cohort_teachers"("cohort_id", "member_id");

-- CreateIndex
CREATE INDEX "pricing_offers_school_id_sellable_type_sellable_id_idx" ON "pricing_offers"("school_id", "sellable_type", "sellable_id");

-- CreateIndex
CREATE INDEX "enrollments_school_id_student_user_id_status_idx" ON "enrollments"("school_id", "student_user_id", "status");

-- CreateIndex
CREATE INDEX "lesson_access_school_id_idx" ON "lesson_access"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_access_enrollment_id_lesson_id_key" ON "lesson_access"("enrollment_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_events_source_key_key" ON "lesson_progress_events"("source_key");

-- CreateIndex
CREATE INDEX "lesson_progress_events_enrollment_id_lesson_id_idx" ON "lesson_progress_events"("enrollment_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "course_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_teachers" ADD CONSTRAINT "cohort_teachers_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_offers" ADD CONSTRAINT "pricing_offers_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_offers" ADD CONSTRAINT "pricing_offers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

