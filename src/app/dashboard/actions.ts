"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import {
  addKeywordRuleToMonitoredPage,
  createMonitoredPage,
  deleteMonitoredPage,
  removeKeywordRuleFromMonitoredPage,
} from "@/lib/services/monitored-pages";
import { runMatchingPassForMonitoredPage } from "@/lib/services/matching-pass";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
}

async function getRequiredUserId() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/?error=auth-required");
  }

  return session.user.id;
}

export async function addMonitoredPageAction(formData: FormData) {
  const userId = await getRequiredUserId();
  const facebookPageId = getRequiredString(formData, "facebookPageId");
  const name = getRequiredString(formData, "name");
  const category = formData.get("category");
  const pictureUrl = formData.get("pictureUrl");
  const pageAccessToken = formData.get("pageAccessToken");

  await createMonitoredPage(userId, {
    facebookPageId,
    name,
    category: typeof category === "string" && category.trim() ? category.trim() : null,
    pictureUrl: typeof pictureUrl === "string" && pictureUrl.trim() ? pictureUrl.trim() : null,
    pageAccessToken:
      typeof pageAccessToken === "string" && pageAccessToken.trim()
        ? pageAccessToken.trim()
        : null,
  });

  revalidatePath("/dashboard");
}

export async function removeMonitoredPageAction(formData: FormData) {
  const userId = await getRequiredUserId();
  const monitoredPageId = getRequiredString(formData, "monitoredPageId");

  await deleteMonitoredPage(userId, monitoredPageId);
  revalidatePath("/dashboard");
}

export async function addKeywordRuleAction(formData: FormData) {
  const userId = await getRequiredUserId();
  const monitoredPageId = getRequiredString(formData, "monitoredPageId");
  const phrase = getRequiredString(formData, "phrase");

  await addKeywordRuleToMonitoredPage(userId, monitoredPageId, phrase);
  revalidatePath("/dashboard");
}

export async function removeKeywordRuleAction(formData: FormData) {
  const userId = await getRequiredUserId();
  const keywordRuleId = getRequiredString(formData, "keywordRuleId");

  await removeKeywordRuleFromMonitoredPage(userId, keywordRuleId);
  revalidatePath("/dashboard");
}

export async function runMatchingPassAction(formData: FormData) {
  const userId = await getRequiredUserId();
  const monitoredPageId = getRequiredString(formData, "monitoredPageId");

  const summary = await runMatchingPassForMonitoredPage(userId, monitoredPageId);

  revalidatePath("/dashboard");
  redirect(
    `/dashboard?matchingPass=1&page=${encodeURIComponent(monitoredPageId)}&processed=${summary.processedItems}&searched=${summary.evaluatedItems}&matched=${summary.matchedEvaluations}`,
  );
}