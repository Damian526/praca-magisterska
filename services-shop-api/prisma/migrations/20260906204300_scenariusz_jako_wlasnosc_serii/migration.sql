-- AlterEnum
BEGIN;
CREATE TYPE "MetricType_new" AS ENUM ('STARTUP_MS', 'UI_RESPONSE_MS', 'API_REQUEST_MS', 'REQUEST_BUILD_MS', 'RENDER_CHECKOUT_MS', 'RENDER_ORDERS_MS', 'RENDER_SEARCH_MS', 'RAM_MB', 'CPU_PERCENT');
ALTER TABLE "measurements" ALTER COLUMN "metric" TYPE "MetricType_new" USING ("metric"::text::"MetricType_new");
ALTER TYPE "MetricType" RENAME TO "MetricType_old";
ALTER TYPE "MetricType_new" RENAME TO "MetricType";
DROP TYPE "public"."MetricType_old";
COMMIT;

-- DropIndex
DROP INDEX "measurements_runId_platform_scenario_metric_idx";

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "recordedAtMs" BIGINT NOT NULL,
ADD COLUMN     "sessionId" VARCHAR(32) NOT NULL;

-- CreateIndex
CREATE INDEX "measurements_sessionId_platform_scenario_metric_idx" ON "measurements"("sessionId", "platform", "scenario", "metric");

