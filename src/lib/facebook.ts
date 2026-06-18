import "server-only";

import { getStoredFacebookAccessToken } from "@/lib/facebook-credentials";

type FacebookProfileResponse = {
  id: string;
  name?: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
};

type FacebookManagedPagesResponse = {
  data?: Array<{
    id: string;
    name?: string;
    category?: string;
    access_token?: string;
    picture?: {
      data?: {
        url?: string;
      };
    };
  }>;
};

type FacebookPageFeedResponse = {
  data?: Array<{
    id: string;
    message?: string;
    story?: string;
    created_time?: string;
    permalink_url?: string;
    comments?: {
      data?: Array<{
        id: string;
        message?: string;
        created_time?: string;
        permalink_url?: string;
      }>;
    };
  }>;
  paging?: {
    cursors?: {
      after?: string;
    };
  };
};

export type FacebookProfile = {
  id: string;
  name: string | null;
  email: string | null;
  pictureUrl: string | null;
};

export type ManagedFacebookPage = {
  facebookPageId: string;
  name: string;
  category: string | null;
  pictureUrl: string | null;
  pageAccessToken: string | null;
};

export type FacebookPagePostWithComments = {
  post: {
    id: string;
    message: string | null;
    story: string | null;
    createdTime: string | null;
    permalinkUrl: string | null;
  };
  comments: Array<{
    id: string;
    message: string | null;
    createdTime: string | null;
    permalinkUrl: string | null;
  }>;
};

export type FacebookPageFeedSnapshot = {
  posts: FacebookPagePostWithComments[];
  afterCursor: string | null;
};

export async function getMyFacebookProfile(userId: string): Promise<FacebookProfile> {
  const accessToken = await getStoredFacebookAccessToken(userId);
  const url = new URL("https://graph.facebook.com/v23.0/me");

  url.searchParams.set("fields", "id,name,email,picture.width(240).height(240)");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Facebook Graph API request failed (${response.status}). ${errorBody}`);
  }

  const payload = (await response.json()) as FacebookProfileResponse;

  return {
    id: payload.id,
    name: payload.name ?? null,
    email: payload.email ?? null,
    pictureUrl: payload.picture?.data?.url ?? null,
  };
}

export async function listManagedFacebookPages(userId: string): Promise<ManagedFacebookPage[]> {
  const accessToken = await getStoredFacebookAccessToken(userId);
  const url = new URL("https://graph.facebook.com/v23.0/me/accounts");

  url.searchParams.set("fields", "id,name,category,picture.width(160).height(160),access_token");
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Facebook managed pages request failed (${response.status}). ${errorBody}`);
  }

  const payload = (await response.json()) as FacebookManagedPagesResponse;

  return (payload.data ?? [])
    .filter((page): page is NonNullable<typeof page> & { id: string; name: string } => Boolean(page?.id && page?.name))
    .map((page) => ({
      facebookPageId: page.id,
      name: page.name,
      category: page.category ?? null,
      pictureUrl: page.picture?.data?.url ?? null,
      pageAccessToken: page.access_token ?? null,
    }));
}

export async function getPageFeedSnapshot(
  pageId: string,
  pageAccessToken: string,
): Promise<FacebookPageFeedSnapshot> {
  const url = new URL(`https://graph.facebook.com/v23.0/${pageId}/feed`);

  url.searchParams.set(
    "fields",
    "id,message,story,created_time,permalink_url,comments.limit(50){id,message,created_time,permalink_url}",
  );
  url.searchParams.set("limit", "25");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Facebook page feed request failed (${response.status}). ${errorBody}`);
  }

  const payload = (await response.json()) as FacebookPageFeedResponse;

  const posts = (payload.data ?? []).map((post) => ({
    post: {
      id: post.id,
      message: post.message ?? null,
      story: post.story ?? null,
      createdTime: post.created_time ?? null,
      permalinkUrl: post.permalink_url ?? null,
    },
    comments: (post.comments?.data ?? []).map((comment) => ({
      id: comment.id,
      message: comment.message ?? null,
      createdTime: comment.created_time ?? null,
      permalinkUrl: comment.permalink_url ?? null,
    })),
  }));

  return {
    posts,
    afterCursor: payload.paging?.cursors?.after ?? null,
  };
}