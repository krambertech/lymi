---
status: accepted
date: 2026-09-13
---

# Product previews use isolated disposable Workers and synthetic learners

Product-affecting pull requests deploy an authenticated product preview to a stable Cloudflare alias after CI quality checks pass. Each pull request receives its own temporary Worker, D1 database, KV namespace and R2 bucket, named from the pull request number and deleted when the pull request closes. The GitHub deployment link carries a derived capability, establishes a host-only preview cookie, signs in a synthetic learner and seeds representative data.

The preview is a separate build mode, not a version of the production `lymi` Worker. Its generated Wrangler configuration removes the custom domain and cron trigger, replaces every storage binding, sets its canonical `PRODUCT_URL` to the stable preview alias and includes the existing persona tools. It receives no production database, session namespace, audio bucket, Google, OpenAI, push or other provider credentials. The production configuration keeps `preview_urls: false` because a preview version of that Worker would retain production bindings.

## Context

The public site can use an ordinary version alias because it has no authentication, product sessions or learner data. The product cannot: Better Auth has one canonical origin, its cookies are host-only, Google redirect URIs are exact, and a Worker version captures its bindings. Pointing a production Worker version at a preview URL would therefore be unusable for sign-in while still capable of reaching production D1, KV and R2.

Reviewers need a link that opens without local setup and exposes realistic empty, populated, review and language states. Lymi already maintains deterministic synthetic personas for local development, so reusing those states in a disposable remote environment keeps the preview representative without copying private data.

## Considered options

- Preview the production Worker with a version alias. Rejected because the alias would retain production bindings and would not be a trusted Better Auth or Google origin.
- Point a preview frontend at the production API. Rejected because it would weaken the same-origin session boundary and let preview code act on learner data.
- Share one preview Worker and database across pull requests. Rejected because concurrent branches would mutate the same state and incompatible migrations could collide.
- Register every preview URL with Google. Rejected because redirect URIs are exact and pull-request URLs are temporary; synthetic persona sign-in is faster and carries no external credential.
- Protect the isolated preview with Cloudflare Access. Deferred because the repository deployment link already carries a scoped capability and all stored data is synthetic; Access remains available if preview links need broader circulation.

## Consequences

- The GitHub `app-preview` environment holds one Cloudflare token with Worker Scripts, D1, KV and R2 edit access, plus one root secret used to derive stable per-pull-request Better Auth and preview-access keys.
- Pull requests from forks never receive preview credentials or deploy an app preview.
- A raw or guessed preview hostname returns 403. `/api/health` remains public so CI can verify the exact uploaded Worker version, while the deployment link is the only entry into the app.
- Preview data persists across commits in one pull request so a reviewer can keep working; the preview panel can switch or reseed personas. Closing the pull request deletes the Worker and its storage.
- Preview resource creation, migration, upload, sign-in, seed and exact-version health are all CI checks. Cleanup is idempotent so a pull request that never needed a preview closes cleanly.
- The preview intentionally cannot exercise Google OAuth, MCP OAuth clients, AI enrichment, generated audio or push delivery. Those remain local contract tests and production smoke checks rather than reasons to expose production secrets.
