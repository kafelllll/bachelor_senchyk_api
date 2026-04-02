-- Add status, preferredExchangeItems, and expiresAt fields
ALTER TABLE "Announcement"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "preferredExchangeItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "expiresAt" TIMESTAMP;

-- Add check constraint for status enum
ALTER TABLE "Announcement"
  ADD CONSTRAINT status_check CHECK ("status" IN ('active', 'pending', 'rejected', 'archived'));
