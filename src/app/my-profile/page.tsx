import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentSession } from "@/lib/auth";
import { getMyFacebookProfile } from "@/lib/facebook";

export default async function MyProfilePage() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/?error=auth-required");
  }

  let profileError: string | null = null;
  let profile: Awaited<ReturnType<typeof getMyFacebookProfile>> | null = null;

  try {
    profile = await getMyFacebookProfile(session.user.id);
  } catch (error) {
    profileError = error instanceof Error ? error.message : "The Facebook profile request failed.";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-strong)]">My Profile</p>
          <h1 className="section-title mt-2 text-4xl font-semibold">Your backend-fetched Facebook identity</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Manage pages
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

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="glass-panel flex flex-col gap-8 rounded-[2rem] px-8 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/80">
              {profile?.pictureUrl ? (
                <Image
                  src={profile.pictureUrl}
                  alt={profile.name ? `${profile.name} profile picture` : "Facebook profile picture"}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-semibold text-[var(--brand-strong)]">
                  {(profile?.name ?? session.user.name ?? "S").slice(0, 1)}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="status-chip w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
                Graph API via backend
              </span>
              <h2 className="text-3xl font-semibold tracking-[-0.04em]">{profile?.name ?? session.user.name ?? "Unknown user"}</h2>
              <p className="text-sm text-[var(--muted-ink)]">This page renders profile data fetched by the backend using the encrypted token stored in Prisma.</p>
            </div>
          </div>

          {profileError ? (
            <div className="rounded-3xl border border-[rgba(146,64,14,0.18)] bg-[rgba(251,191,36,0.12)] px-5 py-4 text-sm leading-6 text-[var(--warning)]">
              {profileError} Replace the placeholder Facebook credentials in your local environment and sign in again.
            </div>
          ) : null}

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-ink)]">Facebook name</dt>
              <dd className="mt-2 text-lg font-medium">{profile?.name ?? "Unavailable"}</dd>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-ink)]">Email</dt>
              <dd className="mt-2 text-lg font-medium">{profile?.email ?? session.user.email ?? "Unavailable"}</dd>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-ink)]">Facebook id</dt>
              <dd className="mt-2 break-all text-lg font-medium">{profile?.id ?? "Unavailable"}</dd>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-ink)]">Session identity</dt>
              <dd className="mt-2 break-all text-lg font-medium">{session.user.id}</dd>
            </div>
          </dl>
        </article>

        <aside className="glass-panel flex flex-col gap-5 rounded-[2rem] px-7 py-7">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Security proof points</h2>
          <ul className="flex flex-col gap-4 text-sm leading-6 text-[var(--muted-ink)]">
            <li>The browser receives only minimal session data: user id, name, email, and image.</li>
            <li>The Facebook access token is stored encrypted in the backend and read only when the server makes a Graph API request.</li>
            <li>The Graph API call for this page happens in a server-only module, not in a client component or browser fetch.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}