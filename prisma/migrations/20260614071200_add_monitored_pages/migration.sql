-- CreateTable
CREATE TABLE "MonitoredPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "facebookPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "pictureUrl" TEXT,
    "encryptedPageAccessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonitoredPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageSyncCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monitoredPageId" TEXT NOT NULL,
    "afterCursor" TEXT,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageSyncCheckpoint_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "MonitoredPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredPage_userId_facebookPageId_key" ON "MonitoredPage"("userId", "facebookPageId");

-- CreateIndex
CREATE UNIQUE INDEX "PageSyncCheckpoint_monitoredPageId_key" ON "PageSyncCheckpoint"("monitoredPageId");
