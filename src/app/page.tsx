import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInButton } from "@/components/sign-in-button";
import { getCurrentSession } from "@/lib/auth";

type HomePageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const recoveryMessages: Record<string, string> = {
  "auth-required": "Sign in with Facebook to open your SocialPulse workspace.",
  OAuthSignin: "Facebook sign-in could not be started. Check your app credentials and try again.",
  OAuthCallback: "Facebook returned to SocialPulse, but the callback could not be completed. Check the server log and try again.",
  Callback: "Facebook returned to SocialPulse, but the callback could not be completed. Check the server log and try again.",
  AccessDenied: "Facebook denied the sign-in request. Choose an account and approve access to continue.",
  TokenPersistence: "Facebook authentication succeeded, but SocialPulse could not store the backend token securely. Check the server logs and retry.",
};

export default async function Home({ searchParams }: HomePageProps) {
  const session = await getCurrentSession();

  if (session?.user?.id) {
    redirect("/my-profile");
  }

  const params = (await searchParams) ?? {};
  const recoveryMessage = params.error ? recoveryMessages[params.error] ?? "Authentication did not complete. Try signing in again." : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="text-lg font-semibold tracking-[-0.04em] text-[var(--ink)]">
          SocialPulse
        </Link>
        <SignInButton />
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-12 pt-4 sm:px-10 lg:flex-row lg:items-stretch lg:gap-8">
        <section className="glass-panel relative flex flex-1 flex-col justify-between overflow-hidden rounded-[2rem] px-8 py-10 sm:px-12 sm:py-12">
          <div className="absolute right-[-5rem] top-[-4rem] h-44 w-44 rounded-full bg-[rgba(22,101,52,0.12)] blur-3xl" />
          <div className="absolute bottom-[-3rem] left-[-2rem] h-36 w-36 rounded-full bg-white/70 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-6">
            <span className="status-chip w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Authentication PoC
            </span>
            <h1 className="section-title max-w-3xl text-5xl font-semibold sm:text-6xl">
              Server-side Facebook auth with zero provider secrets in the browser.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted-ink)]">
              This proof of concept signs users in with Facebook, stores the access token only in the backend, and uses backend-initiated Graph API calls to render a protected profile workspace.
            </p>
          </div>

          {recoveryMessage ? (
            <div className="relative z-10 mt-8 rounded-3xl border border-[rgba(146,64,14,0.18)] bg-[rgba(251,191,36,0.12)] px-5 py-4 text-sm leading-6 text-[var(--warning)]">
              {recoveryMessage}
            </div>
          ) : null}

          <div className="relative z-10 mt-10 flex flex-col gap-4 sm:flex-row">
            <SignInButton large />
            <Link
              href="/auth/error"
              className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/60 px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
            >
              Review recovery states
            </Link>
          </div>
        </section>

        <aside className="glass-panel flex w-full flex-col gap-5 rounded-[2rem] px-6 py-7 sm:px-8 lg:max-w-sm">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">What this proves</h2>
          <ul className="flex flex-col gap-4 text-sm leading-6 text-[var(--muted-ink)]">
            <li>Facebook client id and secret stay on the server in validated environment variables.</li>
            <li>OAuth access tokens are encrypted at rest in the backend before future Graph API use.</li>
            <li>The My Profile page is hydrated from a backend-only Graph API request, not from the browser.</li>
          </ul>
        </aside>
      </main>
    </div>
  );
}
