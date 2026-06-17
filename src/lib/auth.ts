import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { saveFacebookCredential } from "@/lib/facebook-credentials";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "database",
  },
  providers: [
    FacebookProvider({
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "email public_profile pages_show_list",
          auth_type: "rerequest",
        },
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async session({ session, user }) {
      return buildSession(session, user.id);
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "facebook" || !account.access_token) {
        return;
      }

      try {
        await persistFacebookToken({
          providerAccountId: account.providerAccountId,
          fallbackUserId: user.id,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          scope: account.scope,
          tokenType: account.token_type,
        });
      } catch (error) {
        console.error("Facebook token persistence failed", error);
      }
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
};

type PersistFacebookTokenInput = {
  providerAccountId: string;
  fallbackUserId?: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  tokenType?: string | null;
};

async function persistFacebookToken(input: PersistFacebookTokenInput) {
  const persistedAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "facebook",
        providerAccountId: input.providerAccountId,
      },
    },
    select: {
      userId: true,
    },
  });

  const userId = persistedAccount?.userId ?? input.fallbackUserId;

  if (!userId) {
    throw new Error("No persisted user record is available for the Facebook account.");
  }

  await saveFacebookCredential({
    userId,
    providerAccountId: input.providerAccountId,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
    scope: input.scope,
    tokenType: input.tokenType,
  });

  await prisma.account.updateMany({
    where: {
      userId,
      provider: "facebook",
      providerAccountId: input.providerAccountId,
    },
    data: {
      access_token: null,
      refresh_token: null,
      expires_at: input.expiresAt ?? null,
      scope: input.scope ?? null,
      token_type: input.tokenType ?? null,
    },
  });
}

function buildSession(session: Session, userId: string): Session {
  if (session.user) {
    session.user.id = userId;
  }

  return session;
}

export function getCurrentSession() {
  return getServerSession(authOptions);
}