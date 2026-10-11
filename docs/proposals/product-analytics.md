---
status: accepted
date: 2026-10-11
decision: "Use shared opt-in analytics across both Lymi domains, with a custom banner and PostHog disclosed in the details."
---

# Product analytics foundation

Measure the visitor-to-first-review journey with one EU PostHog project, shared consent, opaque identity and a typed event contract. The agreed behavior, producer meanings, privacy boundaries and extension rules live in [the instrumentation guide](../analytics.md); [the stack](../stack.md#analytics-workers-analytics-engine-and-posthog-eu) owns the architecture.

The custom banner follows Lymi's existing interface and supports English, Ukrainian and Russian. Permission enables shared visitor identity and account linkage; decline stops browser analytics, removes identifiers and saves the account preference for connected apps and durable work. Filtered operational error monitoring works independently. Recordings remain off pending a separate masking and capture decision.

Delivery includes the event wishlist's implemented flows, compatibility for `review_graded` and legacy additions/import outcomes, internal account classification and an instrumentation requirement in the definition of done. CSV/Quizlet adapters and native mobile instrumentation are future extensions. Dashboard consumers should validate live production ingestion before building the activation funnel.
