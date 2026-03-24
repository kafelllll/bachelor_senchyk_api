-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plantName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "careLevel" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "description" TEXT,
    "additionalTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pestFree" BOOLEAN,
    "readyToExchange" BOOLEAN,
    "genus" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
