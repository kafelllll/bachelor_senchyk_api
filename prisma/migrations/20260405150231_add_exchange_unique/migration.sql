/*
  Warnings:

  - A unique constraint covering the columns `[initiatorId,receiverId,announcementId]` on the table `Exchange` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Exchange_initiatorId_receiverId_announcementId_key" ON "Exchange"("initiatorId", "receiverId", "announcementId");
