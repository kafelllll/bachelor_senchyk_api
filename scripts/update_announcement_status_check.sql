ALTER TABLE "Announcement" DROP CONSTRAINT IF EXISTS "status_check";
ALTER TABLE "Announcement" ADD CONSTRAINT "status_check" CHECK ("status" IN ('active','pending','rejected','inactive'));
