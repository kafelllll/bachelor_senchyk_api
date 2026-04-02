-- Add new matching-related fields for announcements
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "photo";

ALTER TABLE "Announcement"
  ADD COLUMN "wateringFreq" TEXT,
  ADD COLUMN "lightReqs" TEXT,
  ADD COLUMN "humidity" TEXT,
  ADD COLUMN "toxicity" TEXT,
  ADD COLUMN "growthRate" TEXT,
  ADD COLUMN "hasOffspring" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add check constraints for enum values
ALTER TABLE "Announcement"
  ADD CONSTRAINT watering_check CHECK ("wateringFreq" IN ('rare', 'moderate', 'frequent', NULL)),
  ADD CONSTRAINT light_check CHECK ("lightReqs" IN ('bright', 'partial', 'shade', NULL)),
  ADD CONSTRAINT humidity_check CHECK ("humidity" IN ('low', 'medium', 'high', NULL)),
  ADD CONSTRAINT toxicity_check CHECK ("toxicity" IN ('non-toxic', 'slightly-toxic', 'toxic', NULL)),
  ADD CONSTRAINT growth_check CHECK ("growthRate" IN ('slow', 'moderate', 'fast', NULL));
