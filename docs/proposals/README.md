# Product proposals

One file per product direction worth preserving before it becomes a decision or scheduled work. A proposal should state what is attractive about the direction, what remains open, and what evidence would justify pursuing it.

Proposals are not commitments. When a direction is chosen, record any hard-to-reverse technical decision in [an ADR](../adr/README.md) and put executable delivery work in [`docs/plans`](../plans).

## Writing a proposal

Use a proposal for one product or technical direction that is worth exploring but is not approved.

- Use frontmatter with `status: exploration`, the current `date`, and `decision: none` until a decision is made.
- Open with the opportunity or question and state clearly what is not decided.
- Separate confirmed evidence, hypotheses, and the current leaning. Date and cite external facts that may change.
- Compare at most three leading options. Include only differences that could change the decision.
- Keep open questions to those that block or materially alter a decision, then end with the evidence or choice needed to proceed.
- Describe only enough technical shape to test feasibility. Leave delivery steps, schemas, task lists, and estimates to a plan after the direction is chosen.

Aim for fewer than 1,000 words. Link extended research instead of reproducing it. When the direction advances, update the proposal's status and create the ADR or plan without rewriting exploration as settled history.

| Proposal | Status |
| --- | --- |
| [Card images and visual review](card-images-and-visual-review.md) | Accepted by ADR 0014, planned in [docs/plans/2026-09-13-card-images-and-visual-review.md](../plans/2026-09-13-card-images-and-visual-review.md) |
| [Daily review goal and rolling queue](daily-review-goal-and-rolling-queue.md) | Accepted; planned in [docs/plans/2026-09-13-daily-review-goal-and-rolling-queue.md](../plans/2026-09-13-daily-review-goal-and-rolling-queue.md) |
| [Lantern flame metaphor](lantern-flame-metaphor.md) | Exploration |
| [Public website and product app architecture](public-website-and-product-app.md) | Partially accepted by ADR 0008 |
| [Market differentiation and go-to-market](market-differentiation-and-go-to-market.md) | Exploration; the localization section is decided by ADR 0012 and 0013 and planned in [docs/plans/2026-09-12-localization.md](../plans/2026-09-12-localization.md) |
| [Open-source strategy](open-source-strategy.md) | Exploration |
| [End-to-end testing CI policy](end-to-end-testing-ci-policy.md) | Exploration |
| [Public deck library and progressive series](public-deck-library-and-progressive-series.md) | Accepted by ADR 0015 and ADR 0016; planned in [docs/plans/2026-09-13-public-deck-library-and-progressive-series.md](../plans/2026-09-13-public-deck-library-and-progressive-series.md) |
| [Shared decks](shared-decks.md) | Accepted by ADR 0011, planned |
| [Payments and a low-cost paid plan](premium-subscription-and-payments.md) | Exploration |
