import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

type CredentialInput = {
  userId: string;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  tokenType?: string | null;
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function saveFacebookCredential(
  input: CredentialInput,
  db: PrismaLike = prisma,
) {
  return db.facebookCredential.upsert({
    where: {
      userId: input.userId,
    },
    create: {
      userId: input.userId,
      providerAccountId: input.providerAccountId,
      encryptedAccessToken: encryptSecret(input.accessToken),
      encryptedRefreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      accessTokenExpiresAt: input.expiresAt ? new Date(input.expiresAt * 1000) : null,
      accessTokenScope: input.scope ?? null,
      tokenType: input.tokenType ?? null,
    },
    update: {
      providerAccountId: input.providerAccountId,
      encryptedAccessToken: encryptSecret(input.accessToken),
      encryptedRefreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      accessTokenExpiresAt: input.expiresAt ? new Date(input.expiresAt * 1000) : null,
      accessTokenScope: input.scope ?? null,
      tokenType: input.tokenType ?? null,
    },
  });
}

export async function getStoredFacebookAccessToken(userId: string) {
  const credential = await prisma.facebookCredential.findUnique({
    where: {
      userId,
    },
  });

  if (credential) {
    return decryptSecret(credential.encryptedAccessToken);
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "facebook",
      access_token: {
        not: null,
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  if (!account?.access_token) {
    throw new Error("No stored Facebook token was found for this user.");
  }

  await saveFacebookCredential({
    userId,
    providerAccountId: account.providerAccountId,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    expiresAt: account.expires_at,
    scope: account.scope,
    tokenType: account.token_type,
  });

  await prisma.account.update({
    where: {
      id: account.id,
    },
    data: {
      access_token: null,
      refresh_token: null,
    },
  });

  return account.access_token;
}