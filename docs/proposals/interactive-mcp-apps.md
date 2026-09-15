---
status: exploration
date: 2026-09-13
decision: none
---

# Interactive MCP apps

This proposal explores whether Lymi should add compact interactive responses to its existing remote MCP server so learners can inspect and act on results inside ChatGPT or Claude. It is not a decision to build provider-specific applications, submit a directory listing, or make review available through an assistant.

Public legal and support readiness is tracked in [#82](https://github.com/krambertech/lymi/issues/82). Preparing the existing MCP server for public directory review is tracked in [#83](https://github.com/krambertech/lymi/issues/83) and does not depend on interactive UI.

## Opportunity

Lymi's MCP tools already return text and structured data for decks, cards, settings, due counts, and insights. A small interactive result could make a few high-value moments easier to understand, especially the outcome of adding several cards, inspecting a found card, or seeing a deck summary without reading a long response.

Review remains a learner-only experience in Lymi. An MCP App must not expose grading controls or allow an assistant to create review evidence.

## Confirmed evidence

- As checked on 2026-09-13, OpenAI accepts MCP-only plugins for its public directory and treats UI components as optional, so interactive UI is not a prerequisite for listing Lymi: [OpenAI submission guide](https://developers.openai.com/plugins/deploy/submission).
- As checked on 2026-09-13, Anthropic accepts remote MCP servers with or without MCP Apps; connectors with interactive UI require additional screenshots and review material: [Anthropic directory submission guide](https://claude.com/docs/connectors/building/submission).
- Lymi already exposes one standards-based MCP tool surface that can be exercised by multiple clients.
- Provider capabilities and directory requirements can change and must be rechecked before a decision or submission.

## Options

1. **Publish the plain MCP connector.** Complete #82 and #83, then learn from real usage before adding an interface. This is the baseline and lowest-maintenance option.
2. **Add a few portable MCP App responses.** Keep one shared standards-based server and add UI only where it materially improves comprehension or action. Platform-specific adapters would be added only where required.
3. **Build separate provider-specific experiences.** Tailor distinct ChatGPT and Claude integrations. This offers the most control but creates the largest product, review, and maintenance burden, with no current evidence that Lymi needs it.

## Current leaning

Start with the plain connector. If real usage reveals a repeated comprehension or action problem, test one shared interactive response for `add_cards`: show what was added or skipped, preserve provenance, and offer safe ways to inspect the affected cards in Lymi.

The text and structured result must remain complete when a client cannot render the component. Interactive UI is an enhancement, not a second product contract.

## Product boundaries

- Learner-written content wins, and AI-generated content keeps its provenance.
- MCP clients may add and tend cards but never grade reviews.
- Authentication and authorization remain user-specific, private, and scope-limited.
- Every write remains visible in Activity and the audit trail.
- Card and lesson content must not leak through logs, analytics, screenshots, or shared component state.
- No platform-exclusive capability should be added without evidence that the shared MCP contract cannot support the learner need.

## Evidence needed to proceed

- Real use of the plain connector shows a repeated problem that a visual response could solve better than clearer text or schemas.
- A small portability spike demonstrates that the same component and fallback can work acceptably in both ChatGPT and Claude.
- The added latency, payload size, accessibility work, privacy exposure, testing, and release burden are proportionate to the learner benefit.
- Provider APIs and review expectations are stable enough to support the experience without parallel products.

## Open questions

- Which MCP result benefits most from an interface rather than better text and structured output?
- How portable are component rendering, actions, authentication, and fallback behavior across providers?
- Which actions can safely originate in a component, and which require confirmation or a handoff to Lymi?
- How should private card content be represented in provider-hosted rendering and review screenshots?
- What versioning and operational burden does interactive UI add to the MCP server?
- Does the experience improve learner comprehension enough to justify its maintenance cost?

## Decision gate

Consider accepting this proposal only after #82 and #83 are complete, the plain connector has been tested with public-directory-style accounts, a repeated learner problem has been observed, and a portability spike preserves Lymi's product invariants in both providers.

If accepted, record consequential platform and portability choices in an ADR and add a focused delivery section here. Until then, interactive MCP Apps remain optional future exploration.
