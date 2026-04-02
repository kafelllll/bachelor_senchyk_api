-- Add multiple photos and cover photo for announcements
ALTER TABLE "Announcement"
  ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "coverPhoto" TEXT;

-- Backfill existing photo into new fields
UPDATE "Announcement"
SET
  "coverPhoto" = "photo",
  "photos" = CASE
    WHEN "photo" IS NOT NULL THEN ARRAY["photo"]
    ELSE ARRAY[]::TEXT[]
  END
WHERE "coverPhoto" IS NULL;
