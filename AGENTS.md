# Project Guidelines

## Project Identity

***Working product name:* SocialPulse

## Vision
Build SocialPulse as a personal social-listening workspace for Facebook page monitoring. The product should help a user discover when specific keywords appear in public page posts and comments, understand the surrounding conversation, and react quickly through a clear dashboard and alerting flow.

The application should prioritize trust, signal quality, and operational clarity over broad platform coverage. Start with Facebook public pages only, and design the system so additional sources can be added later without rewriting the core ingestion, matching, or alerting flows.

## Product Goals
- Deliver a polished Next.js application for authenticated users to monitor Facebook content relevant to their brand, competitors, or industry.
- Use NextAuth.js for Facebook sign-in, secure session handling, and controlled server-side token management.
- Fetch public page posts and comments through the Meta Graph API, then index matches for user-configurable keywords.
- Present matches in a dashboard with useful filtering, history, and lightweight analytics.
- Send timely alerts when new matches are found.
- Respect API limits, partial failures, and token lifecycle constraints as first-class product concerns.

## Non-Goals
- Do not support scraping, unofficial APIs, or browser automation.
- Do not store Facebook access tokens in local storage, session storage, or client-visible cookies.
- Do not optimize for every social platform in the first version. Build extension points, but ship Facebook-first.
- Do not treat the dashboard as a generic BI tool. It should stay focused on monitoring, triage, and trend visibility.

## Required Stack
- Next.js with the App Router and TypeScript.
- NextAuth.js for authentication, session management, and OAuth callback handling.
- A server-side database for users, monitored pages, keywords, normalized content, matches, alert history, and OAuth credentials.
- Meta Graph API as the only Facebook integration surface.

## Architecture
Organize the application around clear product boundaries instead of page-driven code.

### 1. Presentation Layer
- Use Next.js route groups for authenticated and unauthenticated experiences.
- Keep UI responsibilities in app routes and reusable components.
- The header should show a Sign in with Facebook action only when the user is unauthenticated.
- Build a responsive dashboard with sections for overview metrics, recent matches, monitored pages, keyword configuration, and alert history.

### 2. Auth and Identity
- Implement Facebook login through NextAuth.js.
- Always force the Facebook consent/account chooser flow when signing in so the user can explicitly select an account.
- Handle OAuth success, denial, and callback error states explicitly.
- Store provider access tokens and refresh metadata on the server only.
- Keep the browser session minimal and never expose provider secrets to client components.

### 3. Ingestion Layer
- Isolate Meta Graph API access in a dedicated server-side module.
- Separate page discovery, post retrieval, comment retrieval, and token refresh responsibilities.
- Expect pagination, missing fields, permission gaps, and rate limits.
- Make ingestion idempotent so repeated syncs do not create duplicate posts, comments, or matches.

### 4. Domain Services
- Create explicit services for monitored pages, keyword rules, content normalization, matching, and alerts.
- Normalize posts and comments into a shared internal content model so search, analytics, and alerting do not depend on raw API response shapes.
- Treat matching as a reusable capability that can run during ingestion and during future backfills or reprocessing.

### 5. Persistence Layer
- Model data so raw source content, normalized content, and match events are distinct concepts.
- Preserve enough source metadata to trace each match back to the original Facebook page, post, comment, and fetch timestamp.
- Track ingestion checkpoints and sync status per page so background jobs can resume safely.
- Store alert delivery records to avoid duplicate notifications.

### 6. Background Processing
- Keep data fetching and alert generation out of request-response paths when possible.
- Prefer scheduled or queued server-side jobs for page syncs, rechecks, and alert dispatch.
- Design background work to be retryable and observable.

## Core Flows

### Authentication Flow
- Unauthenticated users land on a marketing or dashboard entry page with a visible Sign in with Facebook button in the header.
- The sign-in flow always prompts for account selection and consent.
- After callback completion, route the user into the authenticated workspace.
- If OAuth fails, show actionable recovery states rather than a generic error page.

### Monitoring Flow
- A user configures one or more public Facebook pages and one or more keywords.
- The system syncs posts for each page, then fetches comments for relevant posts.
- Content is normalized and checked against keyword rules.
- Matching content is stored and shown in the dashboard with enough context for review.

### Alert Flow
- New matches create alert candidates.
- Alert rules decide whether to notify immediately, batch, or suppress duplicates.
- Users can review delivered alerts and their underlying matched content in the dashboard.

## Security and Privacy
- Keep all token exchange, refresh, and persistence on the server.
- Encrypt sensitive credentials at rest if the chosen persistence stack supports it.
- Use least-privilege Facebook scopes and request only what is needed for the product.
- Validate all webhook, callback, and API-derived inputs before persistence.
- Log operational failures without leaking tokens or personally sensitive data.

## Data and API Constraints
- Assume Meta Graph API quotas, pagination, and field-level availability will shape the product.
- Build graceful degradation for deleted content, removed comments, inaccessible pages, and expired permissions.
- Prefer incremental syncs and checkpoints over full refetches.
- Treat API contracts as unstable enough to require thin adapters rather than spreading raw response types across the app.

## UX Priorities
- Make the first-run experience obvious: sign in, connect pages, define keywords, review matches.
- Favor clear filtering and chronology over dense dashboards.
- Visualizations should answer concrete questions such as keyword frequency, source pages, and trend movement.
- Responsive layouts are required; the app must remain usable on mobile and desktop.

## Implementation Guidance
- Keep server components as the default in Next.js and use client components only for interactive UI.
- Keep Facebook API code, auth code, and domain logic out of presentational components.
- Use typed server-side boundaries for provider responses, domain models, and dashboard view models.
- Write code so new providers can eventually plug into the same ingestion and matching pipeline, but do not generalize prematurely.
- Prefer small, testable modules over framework-heavy abstractions.

## Delivery Priorities
Build in this order unless a task requires otherwise:

1. Authentication and secure token persistence.
2. Page and keyword management.
3. Post and comment ingestion with incremental sync.
4. Match storage and dashboard presentation.
5. Alerting and trend visualizations.
6. Hardening for retries, rate limits, and observability.

## Build and Test
- Use Next.js project conventions and keep runnable scripts in package.json.
- Add environment validation early for Facebook app credentials, NextAuth.js secrets, database connection details, and alert provider configuration.
- Prefer integration tests for auth callbacks, ingestion adapters, and match persistence.
- Prefer component and route tests for the dashboard's critical authenticated paths.