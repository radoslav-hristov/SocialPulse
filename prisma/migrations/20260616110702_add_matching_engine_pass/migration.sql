-- CreateTable
CREATE TABLE "MonitoredContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monitoredPageId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "parentSourceId" TEXT,
    "contentUrl" TEXT,
    "rawText" TEXT,
    "normalizedText" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonitoredContent_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "MonitoredPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeywordMatchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monitoredPageId" TEXT NOT NULL,
    "keywordRuleId" TEXT NOT NULL,
    "monitoredContentId" TEXT NOT NULL,
    "matchedPhrase" TEXT NOT NULL,
    "matchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeywordMatchEvent_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "MonitoredPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeywordMatchEvent_keywordRuleId_fkey" FOREIGN KEY ("keywordRuleId") REFERENCES "MonitoredKeywordRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeywordMatchEvent_monitoredContentId_fkey" FOREIGN KEY ("monitoredContentId") REFERENCES "MonitoredContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MonitoredContent_monitoredPageId_publishedAt_idx" ON "MonitoredContent"("monitoredPageId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredContent_monitoredPageId_sourceType_sourceId_key" ON "MonitoredContent"("monitoredPageId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "KeywordMatchEvent_monitoredPageId_matchedAt_idx" ON "KeywordMatchEvent"("monitoredPageId", "matchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordMatchEvent_keywordRuleId_monitoredContentId_key" ON "KeywordMatchEvent"("keywordRuleId", "monitoredContentId");
