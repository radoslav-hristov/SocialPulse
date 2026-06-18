import "server-only";

import { MonitoredContentSourceType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getPageFeedSnapshot } from "@/lib/facebook";
import {
  getMonitoredPageAccessToken,
  getMonitoredPageWithRules,
  updatePageSyncCheckpoint,
} from "@/lib/services/monitored-pages";
import {
  findKeywordMatches,
  normalizeContentText,
} from "@/lib/services/content-normalization";

type MatchingPassSummary = {
  processedItems: number;
  evaluatedItems: number;
  matchedEvaluations: number;
};

type ContentCandidate = {
  sourceType: MonitoredContentSourceType;
  sourceId: string;
  parentSourceId: string | null;
  contentUrl: string | null;
  rawText: string | null;
  publishedAt: Date | null;
};

function parseGraphDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toCandidatesFromFeed(feed: Awaited<ReturnType<typeof getPageFeedSnapshot>>) {
  const candidates: ContentCandidate[] = [];

  for (const item of feed.posts) {
    const postText = [item.post.message, item.post.story].filter(Boolean).join("\n");

    candidates.push({
      sourceType: MonitoredContentSourceType.POST,
      sourceId: item.post.id,
      parentSourceId: null,
      contentUrl: item.post.permalinkUrl,
      rawText: postText || null,
      publishedAt: parseGraphDate(item.post.createdTime),
    });

    for (const comment of item.comments) {
      candidates.push({
        sourceType: MonitoredContentSourceType.COMMENT,
        sourceId: comment.id,
        parentSourceId: item.post.id,
        contentUrl: comment.permalinkUrl,
        rawText: comment.message,
        publishedAt: parseGraphDate(comment.createdTime),
      });
    }
  }

  return candidates;
}

export async function runMatchingPassForMonitoredPage(
  userId: string,
  monitoredPageId: string,
): Promise<MatchingPassSummary> {
  const monitoredPage = await getMonitoredPageWithRules(userId, monitoredPageId);

  if (!monitoredPage) {
    throw new Error("The monitored page could not be found for this user.");
  }

  const pageAccessToken = await getMonitoredPageAccessToken(userId, monitoredPageId);
  const feed = await getPageFeedSnapshot(monitoredPage.facebookPageId, pageAccessToken);
  const candidates = toCandidatesFromFeed(feed);

  const summary: MatchingPassSummary = {
    processedItems: 0,
    evaluatedItems: 0,
    matchedEvaluations: 0,
  };

  const keywordRules = monitoredPage.keywordRules.map((rule) => ({
    id: rule.id,
    normalizedPhrase: rule.normalizedPhrase,
    phrase: rule.phrase,
  }));

  for (const candidate of candidates) {
    summary.processedItems += 1;
    const normalizedText = normalizeContentText(candidate.rawText ?? "");

    const contentRecord = await prisma.monitoredContent.upsert({
      where: {
        monitoredPageId_sourceType_sourceId: {
          monitoredPageId: monitoredPage.id,
          sourceType: candidate.sourceType,
          sourceId: candidate.sourceId,
        },
      },
      create: {
        monitoredPageId: monitoredPage.id,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        parentSourceId: candidate.parentSourceId,
        contentUrl: candidate.contentUrl,
        rawText: candidate.rawText,
        normalizedText,
        publishedAt: candidate.publishedAt,
      },
      update: {
        parentSourceId: candidate.parentSourceId,
        contentUrl: candidate.contentUrl,
        rawText: candidate.rawText,
        normalizedText,
        publishedAt: candidate.publishedAt,
        fetchedAt: new Date(),
      },
    });

    if (!normalizedText) {
      continue;
    }

    summary.evaluatedItems += 1;

    const matchedRules = findKeywordMatches(normalizedText, keywordRules);

    summary.matchedEvaluations += matchedRules.length;

    for (const rule of matchedRules) {
      await prisma.keywordMatchEvent.upsert({
        where: {
          keywordRuleId_monitoredContentId: {
            keywordRuleId: rule.id,
            monitoredContentId: contentRecord.id,
          },
        },
        create: {
          monitoredPageId: monitoredPage.id,
          keywordRuleId: rule.id,
          monitoredContentId: contentRecord.id,
          matchedPhrase: rule.phrase,
        },
        update: {
          matchedPhrase: rule.phrase,
          matchedAt: new Date(),
        },
      });
    }
  }

  await updatePageSyncCheckpoint(userId, monitoredPage.id, feed.afterCursor);

  return summary;
}

export async function listRecentKeywordMatchesForPage(
  userId: string,
  monitoredPageId: string,
  limit = 10,
) {
  return prisma.keywordMatchEvent.findMany({
    where: {
      monitoredPageId,
      monitoredPage: {
        userId,
      },
    },
    orderBy: {
      matchedAt: "desc",
    },
    include: {
      monitoredContent: {
        select: {
          sourceType: true,
          sourceId: true,
          contentUrl: true,
          rawText: true,
          publishedAt: true,
        },
      },
      keywordRule: {
        select: {
          phrase: true,
        },
      },
    },
    take: limit,
  });
}

export async function getMatchingCountsForPage(userId: string, monitoredPageId: string) {
  const baseWhere = {
    monitoredPageId,
    monitoredPage: {
      userId,
    },
  };

  const [postCount, commentCount, matchedCount] = await Promise.all([
    prisma.monitoredContent.count({
      where: {
        ...baseWhere,
        sourceType: MonitoredContentSourceType.POST,
      },
    }),
    prisma.monitoredContent.count({
      where: {
        ...baseWhere,
        sourceType: MonitoredContentSourceType.COMMENT,
      },
    }),
    prisma.keywordMatchEvent.count({ where: baseWhere }),
  ]);

  const searchedCount = postCount + commentCount;

  return {
    postCount,
    commentCount,
    searchedCount,
    matchedCount,
  };
}