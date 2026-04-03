/*
  Warnings:

  - You are about to drop the column `preferredExchangeItems` on the `Announcement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "preferredExchangeItems",
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);
