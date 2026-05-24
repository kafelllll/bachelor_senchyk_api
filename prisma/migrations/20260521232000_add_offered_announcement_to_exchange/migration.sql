ALTER TABLE "Exchange"
ADD COLUMN "offeredAnnouncementId" TEXT;

CREATE INDEX "Exchange_offeredAnnouncementId_idx" ON "Exchange"("offeredAnnouncementId");

ALTER TABLE "Exchange"
ADD CONSTRAINT "Exchange_offeredAnnouncementId_fkey"
FOREIGN KEY ("offeredAnnouncementId") REFERENCES "Announcement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
