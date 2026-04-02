-- Provide default values for existing records first
UPDATE "Announcement"
SET "wateringFreq" = COALESCE("wateringFreq", 'moderate')
WHERE "wateringFreq" IS NULL;

UPDATE "Announcement"
SET "lightReqs" = COALESCE("lightReqs", 'partial')
WHERE "lightReqs" IS NULL;

-- Make wateringFreq and lightReqs mandatory
ALTER TABLE "Announcement"
  ALTER COLUMN "wateringFreq" SET NOT NULL,
  ALTER COLUMN "lightReqs" SET NOT NULL;
