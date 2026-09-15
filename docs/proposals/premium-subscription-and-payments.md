---
status: exploration
date: 2026-09-06
decision: none
---

# Payments and a low-cost paid plan

## Question

Should Lymi add an intentionally inexpensive subscription to make ongoing AI and audio costs sustainable? This is not a decision to charge, choose a provider, restrict a feature, or commit to a price.

## Current leaning

Keep core card creation, decks, review, and access to existing learning data available without payment. A paid plan could include an allowance for new AI enrichment and pronunciation audio. Previously generated audio should probably remain playable after a downgrade because replay has little marginal cost.

A price around €3 per month is a hypothesis, not validated pricing. At that level, fixed transaction fees, tax, typical usage, retries, and abuse materially affect sustainability. An annual option may improve the economics.

Explore a merchant-of-record provider before direct payment processing so international indirect tax, billing, and customer records do not become an early operational burden. Provider pricing and capabilities must be rechecked when the decision becomes active.

## Product and system boundaries

- Entitlements apply consistently across the app, API, and MCP.
- Payment state is stored locally and updated by signed, idempotent events; ordinary requests do not depend on a live provider call.
- Cancellation, payment failure, refunds, delayed or out-of-order events, account deletion, and provider outages have explicit behavior.
- Usage limits are based on measured AI and audio costs rather than an untested promise of unlimited use.
- Checkout, renewal, cancellation, refund, tax, and privacy information is clear before launch.
- Native mobile billing rules are a separate decision; this proposal covers the web product only.

## Evidence needed

- Learners value a paid capability enough to subscribe.
- Real usage shows a sustainable allowance and price.
- The paid boundary does not weaken the core learning promise or lock learners out of their data.
- A provider supports Lymi's location, customers, lifecycle needs, and Better Auth boundary with acceptable fees and administration.

## Open questions

- Which capability is valuable enough to introduce a paid plan?
- What should remain free, and should free use include a small AI or audio allowance?
- What price and billing interval feel fair after tax and transaction costs?
- What happens during cancellation, payment failure, refund, or provider downtime?
- Is a merchant of record worth its higher fee at Lymi's scale?
