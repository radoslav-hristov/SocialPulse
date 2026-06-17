import Link from "next/link";

import { SignInButton } from "@/components/sign-in-button";

const errorMessages: Record<string, { title: string; detail: string }> = {
  OAuthSignin: {
    title: "Facebook sign-in could not start",
    detail: "Verify that FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, and the Facebook redirect URI are configured correctly, then retry the sign-in flow.",
  },
  AccessDenied: {
    title: "Access was denied",
    detail: "Choose the intended Facebook account and approve the requested email and public profile permissions to continue.",
  },
  Callback: {
    title: "The OAuth callback did not complete",
    detail: "Check that your Facebook app has http://localhost:3000/api/auth/callback/facebook registered as a valid OAuth redirect URI and retry.",
  },
  OAuthCallback: {
    title: "The OAuth callback could not be completed",
    detail: "The provider returned to SocialPulse, but the backend could not finish linking the account or storing the provider response. Review the server log and retry.",
  },
  TokenPersistence: {
    title: "The Facebook token could not be stored securely",
    detail: "Authentication reached SocialPulse, but the server could not persist the Facebook token for future backend Graph API requests. Review the server log for the underlying persistence error and retry.",
  },
  default: {
    title: "Authentication needs another attempt",
    detail: "Retry the sign-in flow. If the issue persists, review your local environment variables and Facebook app settings.",
  },
};

type AuthErrorPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = (await searchParams) ?? {};
  const content = params.error ? errorMessages[params.error] ?? errorMessages.default : errorMessages.default;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12 sm:px-10">
      <section className="glass-panel flex w-full flex-col gap-6 rounded-[2rem] px-8 py-10 sm:px-10">
        <span className="status-chip w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--warning)]">
          Recovery state
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="section-title text-4xl font-semibold">{content.title}</h1>
          <p className="text-base leading-7 text-[var(--muted-ink)]">{content.detail}</p>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-white/60 px-5 py-4 text-sm leading-6 text-[var(--muted-ink)]">
          After you update your local environment, retry the Facebook login from the landing page. The OAuth client secret and any resulting access token remain backend-only throughout this flow.
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <SignInButton large />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/60 px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}