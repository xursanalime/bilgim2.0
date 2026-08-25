-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PRO', 'MAX');

-- CreateEnum
CREATE TYPE "SubscriptionState" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UsageMeterKey" AS ENUM ('LIVE_PARTICIPANT_MINUTE', 'LIVE_RECORDED_MINUTE', 'MEDIA_STORAGE_GB_MONTH', 'AI_REQUEST');

-- CreateEnum
CREATE TYPE "QuotaUnit" AS ENUM ('COUNT', 'STORAGE_BYTES', 'DURATION_MINUTES');

-- CreateTable
CREATE TABLE "platform_plans" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "display_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "monthly_price_uzs" INTEGER,
    "annual_price_uzs" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "billing_interval" TEXT NOT NULL DEFAULT 'MONTHLY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_entitlements" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "limit_value" BIGINT,
    "unit" "QuotaUnit" NOT NULL DEFAULT 'COUNT',

    CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usage_prices" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "meter_key" "UsageMeterKey" NOT NULL,
    "unit_price_uzs" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plan_usage_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_subscriptions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "state" "SubscriptionState" NOT NULL DEFAULT 'ACTIVE',
    "subscription_version" INTEGER NOT NULL DEFAULT 1,
    "monthly_price_uzs" INTEGER,
    "period_start" TIMESTAMPTZ,
    "period_end" TIMESTAMPTZ,
    "canceled_at" TIMESTAMPTZ,
    "allow_paid_overage" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "school_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_subscription_entitlements" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "limitValue" BIGINT,
    "unit" "QuotaUnit" NOT NULL DEFAULT 'COUNT',

    CONSTRAINT "school_subscription_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_subscription_usage_prices" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "meter_key" "UsageMeterKey" NOT NULL,
    "unit_price_uzs" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "school_subscription_usage_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_usage" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ NOT NULL,
    "feature_key" TEXT NOT NULL,
    "reserved" BIGINT NOT NULL DEFAULT 0,
    "actual" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "entitlement_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_wallets" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usage_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_wallet_entries" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_charges" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "meter_key" "UsageMeterKey" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_uzs" INTEGER NOT NULL,
    "amount_uzs" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RESERVED',
    "resource_ref" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_plans_code_version_key" ON "platform_plans"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "plan_entitlements_plan_id_feature_key_key" ON "plan_entitlements"("plan_id", "feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "plan_usage_prices_plan_id_meter_key_key" ON "plan_usage_prices"("plan_id", "meter_key");

-- CreateIndex
CREATE UNIQUE INDEX "school_subscriptions_school_id_subscription_version_key" ON "school_subscriptions"("school_id", "subscription_version");

-- CreateIndex
CREATE UNIQUE INDEX "school_subscription_entitlements_subscription_id_feature_ke_key" ON "school_subscription_entitlements"("subscription_id", "feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "school_subscription_usage_prices_subscription_id_meter_key_key" ON "school_subscription_usage_prices"("subscription_id", "meter_key");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_usage_subscription_id_period_start_feature_key_key" ON "entitlement_usage"("subscription_id", "period_start", "feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "usage_wallets_school_id_key" ON "usage_wallets"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_wallet_entries_idempotency_key_key" ON "usage_wallet_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "usage_wallet_entries_wallet_id_idx" ON "usage_wallet_entries"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_charges_idempotency_key_key" ON "usage_charges"("idempotency_key");

-- CreateIndex
CREATE INDEX "usage_charges_subscription_id_idx" ON "usage_charges"("subscription_id");

-- AddForeignKey
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "platform_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_usage_prices" ADD CONSTRAINT "plan_usage_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "platform_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "platform_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscription_entitlements" ADD CONSTRAINT "school_subscription_entitlements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "school_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscription_usage_prices" ADD CONSTRAINT "school_subscription_usage_prices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "school_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_usage" ADD CONSTRAINT "entitlement_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "school_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_wallets" ADD CONSTRAINT "usage_wallets_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_wallet_entries" ADD CONSTRAINT "usage_wallet_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "usage_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

