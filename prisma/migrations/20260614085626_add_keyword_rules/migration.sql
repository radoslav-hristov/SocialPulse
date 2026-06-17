-- CreateTable
CREATE TABLE "MonitoredKeywordRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monitoredPageId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "normalizedPhrase" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonitoredKeywordRule_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "MonitoredPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredKeywordRule_monitoredPageId_normalizedPhrase_key" ON "MonitoredKeywordRule"("monitoredPageId", "normalizedPhrase");
