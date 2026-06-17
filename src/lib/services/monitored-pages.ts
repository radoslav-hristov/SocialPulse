import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

type MonitoredPageInput = {
  facebookPageId: string;
  name: string;
  category?: string | null;
  pictureUrl?: string | null;
  pageAccessToken?: string | null;
};

export type KeywordRuleSummary = {
  id: string;
  phrase: string;
  isActive: boolean;
  createdAt: Date;
};

export type MonitoredPageSummary = {
  id: string;
  facebookPageId: string;
  name: string;
  category: string | null;
  pictureUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;
  keywordRules: KeywordRuleSummary[];
};

export async function listMonitoredPages(userId: string): Promise<MonitoredPageSummary[]> {
  const pages = await prisma.monitoredPage.findMany({
    where: {
      userId,
    },
    include: {
      syncCheckpoint: true,
      keywordRules: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: [
      {
        isActive: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return pages.map((page) => ({
    id: page.id,
    facebookPageId: page.facebookPageId,
    name: page.name,
    category: page.category,
    pictureUrl: page.pictureUrl,
    isActive: page.isActive,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    lastSyncAt: page.syncCheckpoint?.lastSyncAt ?? null,
    keywordRules: page.keywordRules.map((rule) => ({
      id: rule.id,
      phrase: rule.phrase,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    })),
  }));
}

function normalizeKeywordPhrase(phrase: string) {
  return phrase.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function addKeywordRuleToMonitoredPage(
  userId: string,
  monitoredPageId: string,
  phrase: string,
) {
  const normalizedPhrase = normalizeKeywordPhrase(phrase);

  if (normalizedPhrase.length < 2) {
    throw new Error("Keyword rules must contain at least two characters.");
  }

  const monitoredPage = await prisma.monitoredPage.findFirst({
    where: {
      id: monitoredPageId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!monitoredPage) {
    throw new Error("The monitored page could not be found for this user.");
  }

  return prisma.monitoredKeywordRule.upsert({
    where: {
      monitoredPageId_normalizedPhrase: {
        monitoredPageId: monitoredPage.id,
        normalizedPhrase,
      },
    },
    create: {
      monitoredPageId: monitoredPage.id,
      phrase: phrase.trim().replace(/\s+/g, " "),
      normalizedPhrase,
      isActive: true,
    },
    update: {
      phrase: phrase.trim().replace(/\s+/g, " "),
      isActive: true,
    },
  });
}

export async function removeKeywordRuleFromMonitoredPage(userId: string, keywordRuleId: string) {
  await prisma.monitoredKeywordRule.deleteMany({
    where: {
      id: keywordRuleId,
      monitoredPage: {
        userId,
      },
    },
  });
}

export async function createMonitoredPage(userId: string, input: MonitoredPageInput) {
  return prisma.monitoredPage.upsert({
    where: {
      userId_facebookPageId: {
        userId,
        facebookPageId: input.facebookPageId,
      },
    },
    create: {
      userId,
      facebookPageId: input.facebookPageId,
      name: input.name,
      category: input.category ?? null,
      pictureUrl: input.pictureUrl ?? null,
      encryptedPageAccessToken: input.pageAccessToken ? encryptSecret(input.pageAccessToken) : null,
      isActive: true,
    },
    update: {
      name: input.name,
      category: input.category ?? null,
      pictureUrl: input.pictureUrl ?? null,
      encryptedPageAccessToken: input.pageAccessToken ? encryptSecret(input.pageAccessToken) : null,
      isActive: true,
    },
  });
}

export async function deleteMonitoredPage(userId: string, monitoredPageId: string) {
  await prisma.monitoredPage.deleteMany({
    where: {
      id: monitoredPageId,
      userId,
    },
  });
}

export async function updatePageSyncCheckpoint(
  userId: string,
  monitoredPageId: string,
  afterCursor: string | null,
) {
  const page = await prisma.monitoredPage.findFirst({
    where: {
      id: monitoredPageId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!page) {
    throw new Error("The monitored page could not be found for this user.");
  }

  return prisma.pageSyncCheckpoint.upsert({
    where: {
      monitoredPageId: page.id,
    },
    create: {
      monitoredPageId: page.id,
      afterCursor,
      lastSyncAt: new Date(),
    },
    update: {
      afterCursor,
      lastSyncAt: new Date(),
    },
  });
}

export async function getMonitoredPageWithRules(userId: string, monitoredPageId: string) {
  return prisma.monitoredPage.findFirst({
    where: {
      id: monitoredPageId,
      userId,
      isActive: true,
    },
    include: {
      keywordRules: {
        where: {
          isActive: true,
        },
      },
    },
  });
}

export async function getMonitoredPageAccessToken(userId: string, monitoredPageId: string) {
  const page = await prisma.monitoredPage.findFirst({
    where: {
      id: monitoredPageId,
      userId,
    },
    select: {
      encryptedPageAccessToken: true,
    },
  });

  if (!page?.encryptedPageAccessToken) {
    throw new Error("No page access token is stored for this monitored page.");
  }

  return decryptSecret(page.encryptedPageAccessToken);
}