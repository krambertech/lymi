---
status: accepted
date: 2026-10-11
decision: "Collect client/server analytics only with public-site consent carried through signup; no signup checkbox or in-app banner."
---

# Product analytics foundation

Measure the visitor-to-first-review journey with one EU PostHog project, opaque identity and a typed event contract. Event definitions, privacy boundaries and extension rules live in [the instrumentation guide](../analytics.md); [the stack](../stack.md#analytics-workers-analytics-engine-and-posthog-eu) owns the architecture.

Consent is requested only on the public site, with PostHog disclosed in the details and Privacy Policy. Its shared, versioned choice carries through email and Google signup into the account permission used by browser and server events. Signup has no analytics checkbox, and the app has no consent banner. Product Settings links to the public privacy controls for changing or withdrawing permission. Absent, expired and declined choices keep analytics off without restricting signup or learning. Signup and acceptance of Terms do not grant analytics consent.

Delivery includes the event wishlist's implemented flows, compatibility for `review_graded` and legacy additions/import outcomes, internal account classification and instrumentation in the definition of done. CSV/Quizlet adapters and native mobile instrumentation are future extensions. Recordings remain off. Dashboard consumers must validate live production ingestion before building the activation funnel.

## Signup attribution

The `signed_up` contract carries `method`, `first_landing_page`, an external referrer hostname and bounded `utm_source`, `utm_medium` and `utm_campaign` labels. First-touch metadata is persisted only after public permission and delivered on account creation with the same opaque account identity used by later events. Private paths, search terms, names, emails, tokens, `utm_term` and `utm_content` are excluded. A missing referrer is unknown, not proof of a direct visit; declining analytics prevents persistent first-touch linkage and signup does not recover it retroactively.

## Cookieless fallback assessment

Research date: 11 October 2026. PostHog's [cookieless tutorial](https://posthog.com/tutorials/cookieless-tracking) offers `cookieless_mode: "always"` for anonymous audience measurement and `"on_reject"` for a mixture of consented tracking and anonymous measurement. Both require the project's Cookieless server hash mode. This fallback is researched, not enabled or approved for collection without consent.

PostHog computes the anonymous ID from calendar day, user agent, client IP and host; the client stores no persistent analytics identity. Daily rotation prevents reliable multi-day retention, and including the host separates lymi.app from my.lymi.app. Network/browser collisions and changes can distort visitor counts. Anonymous actions can inform same-host, same-day funnels, but cannot replace the account-linked activation journey or safely merge with identified server outcomes. Replay remains outside the fallback.

Enabling this requires changes beyond configuration: Lymi's event sanitizer removes the raw user agent needed by hashing, and its consent gate suppresses rejected events. A future adapter would need an explicitly separate anonymous allowlist, no account identity/person updates, original host and client IP through any relay, timely delivery, and tests of ingestion and attribution. PostHog's ingestion guidance warns that relays using their own IP silently collapse visitors and events with missing hash inputs or disabled project support are dropped, even if Live events shows them.

Recommendation: consider a separate anonymous traffic experiment if broader public traffic counts become necessary; retain the consented account journey for activation and retention. Do not turn on anonymous collection after a rejection as part of this PR. Vendor cookieless support does not establish an Estonian consent exemption: the [EDPB technical-scope guidelines](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf), paragraphs 33 and 35–39, cover instructed JavaScript transmission and RAM storage, and [Estonia's AKI guidance](https://www.aki.ee/isikuandmed/kkk/interneti-ja-veebitegevused) requires prior voluntary permission for additional analytics cookies. Any future consent-free collection needs assessment of its exact data flow under the applicable rules; legitimate interests or a Privacy Policy sentence alone do not resolve the separate ePrivacy requirement.
