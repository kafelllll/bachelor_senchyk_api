-- Rename columns to clearer names
ALTER TABLE "User" RENAME COLUMN "fullName" TO "name";
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
