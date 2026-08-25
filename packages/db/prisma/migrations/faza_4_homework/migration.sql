-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('MCG', 'WRITING', 'READING', 'LISTENING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY', 'GAP_FILL');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'GRADED');

-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('AUTO', 'AI_SUGGESTION', 'TEACHER');

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "due_at" TIMESTAMPTZ,
    "max_points" INTEGER NOT NULL DEFAULT 100,
    "rubric_json" JSONB,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_modules" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "type" "ModuleType" NOT NULL,
    "config_json" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "assignment_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "student_user_id" UUID NOT NULL,
    "enrollment_id" UUID,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "answers_json" JSONB,
    "submitted_at" TIMESTAMPTZ,
    "final_score" INTEGER,
    "final_grader" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_scores" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "module_id" UUID,
    "source" "ScoreSource" NOT NULL,
    "score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "breakdown_json" JSONB,
    "rubric_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "author_user_id" UUID,
    "author_is_ai" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'STUDENT',
    "is_final_marker" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_school_id_lesson_id_idx" ON "assignments"("school_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_modules_assignment_id_position_key" ON "assignment_modules"("assignment_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignment_id_student_user_id_key" ON "submissions"("assignment_id", "student_user_id");

-- CreateIndex
CREATE INDEX "submission_scores_submission_id_idx" ON "submission_scores"("submission_id");

-- AddForeignKey
ALTER TABLE "assignment_modules" ADD CONSTRAINT "assignment_modules_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_scores" ADD CONSTRAINT "submission_scores_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

