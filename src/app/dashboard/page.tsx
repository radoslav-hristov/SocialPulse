import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentSession } from "@/lib/auth";
import { listManagedFacebookPages } from "@/lib/facebook";
import {
  getMatchingCountsForPage,
  listRecentKeywordMatchesForPage,
} from "@/lib/services/matching-pass";
import { listMonitoredPages } from "@/lib/services/monitored-pages";

import {
  addKeywordRuleAction,
  addMonitoredPageAction,
  removeKeywordRuleAction,
  removeMonitoredPageAction,
  runMatchingPassAction,
} from "./actions";

type DashboardPageProps = {
  searchParams?: Promise<{
    q?: string;
    matchingPass?: string;
    page?: string;
    processed?: string;
    searched?: string;
    matched?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/?error=auth-required");
  }

  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const latestRun =
    params.matchingPass === "1"
      ? {
          monitoredPageId: params.page ?? "",
          processed: Number.parseInt(params.processed ?? "0", 10) || 0,
          searched: Number.parseInt(params.searched ?? "0", 10) || 0,
          matched: Number.parseInt(params.matched ?? "0", 10) || 0,
        }
      : null;

  const [monitoredPages, managedPagesResult] = await Promise.all([
    listMonitoredPages(session.user.id),
    listManagedFacebookPages(session.user.id)
      .then((pages) => ({ pages, error: null as string | null }))
      .catch((error) => ({
        pages: [],
        error: error instanceof Error ? error.message : "The managed pages request failed.",
      })),
  ]);

  const managedPages = managedPagesResult.pages;
  const managedPagesError = managedPagesResult.error;

  const normalizedQuery = query.toLowerCase();
  const filteredManagedPages = normalizedQuery
    ? managedPages.filter((page) => {
        const haystack = [page.name, page.category ?? "", page.facebookPageId].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : managedPages;

  const monitoredPageIds = new Set(monitoredPages.map((page) => page.facebookPageId));
  const recentMatchesByPage = new Map<string, Awaited<ReturnType<typeof listRecentKeywordMatchesForPage>>>();
  const matchingCountsByPage = new Map<string, Awaited<ReturnType<typeof getMatchingCountsForPage>>>();

  await Promise.all(
    monitoredPages.map(async (page) => {
      const [matches, counts] = await Promise.all([
        listRecentKeywordMatchesForPage(session.user.id, page.id, 6),
        getMatchingCountsForPage(session.user.id, page.id),
      ]);

      recentMatchesByPage.set(page.id, matches);
      matchingCountsByPage.set(page.id, counts);
    }),
  );

  const latestRunPageName =
    latestRun?.monitoredPageId
      ? monitoredPages.find((page) => page.id === latestRun.monitoredPageId)?.name ?? "selected page"
      : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-10">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <span className="status-chip w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
            Monitored pages
          </span>
          <div>
            <h1 className="section-title text-4xl font-semibold sm:text-5xl">
              Choose the Facebook pages SocialPulse should watch next.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted-ink)]">
              This dashboard discovers pages your Facebook account manages through a backend-only Graph API request, then stores your selected pages in backend persistence for future ingestion and monitoring.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/my-profile"
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/60 px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            My Profile
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/60 px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            Home
          </Link>
          <SignOutButton />
        </div>
      </header>

      {latestRun ? (
        <section className="mb-6 rounded-3xl border border-[var(--line)] bg-white/70 px-5 py-4 text-sm text-[var(--ink)]">
          <p className="font-semibold">
            Matching pass completed for {latestRunPageName}.
          </p>
          <p className="mt-1 text-[var(--muted-ink)]">
            Processed: {latestRun.processed} | Searched: {latestRun.searched} | Matched: {latestRun.matched}
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel flex flex-col gap-6 rounded-[2rem] px-7 py-7 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Pages you manage on Facebook</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
                Search through the pages Facebook says you manage, then add the ones SocialPulse should monitor next.
              </p>
            </div>

            <form action="/dashboard" className="flex w-full max-w-sm gap-3">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search by page name or id"
                className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
              />
              <button
                type="submit"
                className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Search
              </button>
            </form>
          </div>

          {managedPagesError ? (
            <div className="rounded-3xl border border-[rgba(146,64,14,0.18)] bg-[rgba(251,191,36,0.12)] px-5 py-4 text-sm leading-6 text-[var(--warning)]">
              {managedPagesError} Re-authenticate to grant the new Facebook page-list permission if needed.
            </div>
          ) : null}

          {!managedPagesError && filteredManagedPages.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/50 px-6 py-8 text-sm leading-7 text-[var(--muted-ink)]">
              {managedPages.length === 0
                ? "Facebook did not return any managed pages for this account yet. If you manage pages, sign out and sign back in so the new page-list scope can be granted."
                : "No managed pages match the current search."}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredManagedPages.map((page) => {
              const isMonitored = monitoredPageIds.has(page.facebookPageId);

              return (
                <section
                  key={page.facebookPageId}
                  className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[var(--line)] bg-white/80">
                      {page.pictureUrl ? (
                        <Image
                          src={page.pictureUrl}
                          alt={`${page.name} page picture`}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-lg font-semibold text-[var(--brand-strong)]">
                          {page.name.slice(0, 1)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold tracking-[-0.02em]">{page.name}</h3>
                      <p className="mt-1 text-sm text-[var(--muted-ink)]">
                        {page.category ?? "Facebook page"}
                      </p>
                      <p className="mt-2 break-all text-xs uppercase tracking-[0.16em] text-[var(--muted-ink)]">
                        {page.facebookPageId}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                      {isMonitored ? "Already monitored" : "Ready to add"}
                    </span>

                    {isMonitored ? (
                      <span className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--muted-ink)]">
                        Saved
                      </span>
                    ) : (
                      <form action={addMonitoredPageAction}>
                        <input type="hidden" name="facebookPageId" value={page.facebookPageId} />
                        <input type="hidden" name="name" value={page.name} />
                        <input type="hidden" name="category" value={page.category ?? ""} />
                        <input type="hidden" name="pictureUrl" value={page.pictureUrl ?? ""} />
                        <input type="hidden" name="pageAccessToken" value={page.pageAccessToken ?? ""} />
                        <button
                          type="submit"
                          className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
                        >
                          Add to monitored pages
                        </button>
                      </form>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <aside className="glass-panel flex flex-col gap-5 rounded-[2rem] px-7 py-7">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Saved monitored pages</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
              These pages are now persisted in the backend and can collect keyword matching rules.
            </p>
          </div>

          {monitoredPages.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/50 px-5 py-7 text-sm leading-7 text-[var(--muted-ink)]">
              No pages have been saved yet. Add one from the managed pages list to start building your monitoring workspace.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {monitoredPages.map((page) => (
                <section
                  key={page.id}
                  className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-[var(--line)] bg-white/80">
                      {page.pictureUrl ? (
                        <Image
                          src={page.pictureUrl}
                          alt={`${page.name} page picture`}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--brand-strong)]">
                          {page.name.slice(0, 1)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold">{page.name}</h3>
                          <p className="mt-1 text-sm text-[var(--muted-ink)]">{page.category ?? "Facebook page"}</p>
                        </div>
                        <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                          {page.isActive ? "Active" : "Paused"}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-xs uppercase tracking-[0.16em] text-[var(--muted-ink)]">
                        {page.facebookPageId}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-[var(--muted-ink)]">
                          Last sync checkpoint: {page.lastSyncAt ? page.lastSyncAt.toLocaleString() : "Not synced yet"}
                        </p>
                        <div className="flex items-center gap-2">
                          <form action={runMatchingPassAction}>
                            <input type="hidden" name="monitoredPageId" value={page.id} />
                            <button
                              type="submit"
                              className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              Run matching pass
                            </button>
                          </form>
                          <form action={removeMonitoredPageAction}>
                            <input type="hidden" name="monitoredPageId" value={page.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                            Keyword rules
                          </h4>
                          <span className="text-xs text-[var(--muted-ink)]">
                            {page.keywordRules.length} saved
                          </span>
                        </div>

                        <form action={addKeywordRuleAction} className="mt-3 flex gap-2">
                          <input type="hidden" name="monitoredPageId" value={page.id} />
                          <input
                            type="text"
                            name="phrase"
                            placeholder="Add keyword or phrase"
                            minLength={2}
                            required
                            className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
                          >
                            Add
                          </button>
                        </form>

                        {page.keywordRules.length === 0 ? (
                          <p className="mt-3 text-xs leading-6 text-[var(--muted-ink)]">
                            No matching rules yet. Add your first keyword to activate monitoring intent for this page.
                          </p>
                        ) : (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {page.keywordRules.map((rule) => (
                              <li key={rule.id} className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-strong)] pl-3 pr-1 py-1 text-xs">
                                <span className="max-w-[12rem] truncate">{rule.phrase}</span>
                                <form action={removeKeywordRuleAction}>
                                  <input type="hidden" name="keywordRuleId" value={rule.id} />
                                  <button
                                    type="submit"
                                    className="rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-ink)] transition hover:text-[var(--ink)]"
                                    aria-label={`Remove keyword ${rule.phrase}`}
                                  >
                                    Remove
                                  </button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                            Recent matches
                          </h4>
                          <div className="text-right text-xs text-[var(--muted-ink)]">                            
                            <div>
                              {matchingCountsByPage.get(page.id)?.matchedCount ?? 0} matched / {matchingCountsByPage.get(page.id)?.searchedCount ?? 0} searched
                            </div>                            
                          </div>
                        </div>

                        {(recentMatchesByPage.get(page.id) ?? []).length === 0 ? (
                          <p className="mt-3 text-xs leading-6 text-[var(--muted-ink)]">
                            No matches stored yet. Run a matching pass after adding keyword rules.
                          </p>
                        ) : (
                          <ul className="mt-3 flex flex-col gap-2">
                            {(recentMatchesByPage.get(page.id) ?? []).map((match) => (
                              <li key={match.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-ink)]">
                                  <span className="rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-strong)]">
                                    {match.monitoredContent.sourceType}
                                  </span>
                                  <span>
                                    Rule: <strong>{match.keywordRule.phrase}</strong>
                                  </span>
                                  <span>
                                    Matched: {new Date(match.matchedAt).toLocaleString()}
                                  </span>
                                </div>
                                {match.monitoredContent.rawText ? (
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-ink)]">
                                    {match.monitoredContent.rawText}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}