UPDATE "Announcement" a
SET "status" = 'inactive'
WHERE a."id" IN (
  SELECT "announcementId"
  FROM "Exchange"
  WHERE "status" = 'completed'
)
AND a."status" = 'active';
