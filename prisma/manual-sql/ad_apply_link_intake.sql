-- Safe additive migration for Ad Apply Link / Free Trial Intake MVP.
-- Run manually on Neon (no reset). Example:
--   npx prisma db execute --file prisma/manual-sql/ad_apply_link_intake.sql

CREATE TABLE IF NOT EXISTS "AdApplyLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "landingPageName" TEXT,
    "landingPageUrl" TEXT,
    "landingPageVersion" TEXT,
    "campaignName" TEXT,
    "campaignId" TEXT,
    "adSetName" TEXT,
    "adSetId" TEXT,
    "adName" TEXT,
    "adId" TEXT,
    "placementPage" TEXT,
    "sourceChannel" TEXT NOT NULL DEFAULT 'Facebook Ads',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdApplyLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdApplyLink_slug_key" ON "AdApplyLink"("slug");

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adApplyLinkId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "trialRequestedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adApprovedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adLeadStatus" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "googleMapName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "facebookPage" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adCampaignName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adCampaignId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adSetName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adSetId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "adId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "landingPageVersion" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "applyLinkName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "inboundSourceChannel" TEXT;

CREATE INDEX IF NOT EXISTS "Lead_adApplyLinkId_idx" ON "Lead"("adApplyLinkId");
CREATE INDEX IF NOT EXISTS "Lead_trialRequestedAt_idx" ON "Lead"("trialRequestedAt");
CREATE INDEX IF NOT EXISTS "Lead_adLeadStatus_idx" ON "Lead"("adLeadStatus");
CREATE INDEX IF NOT EXISTS "Lead_adApprovedAt_idx" ON "Lead"("adApprovedAt");

DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_adApplyLinkId_fkey"
    FOREIGN KEY ("adApplyLinkId") REFERENCES "AdApplyLink"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
