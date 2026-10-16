---
status: exploration
date: 2026-10-11
decision: none
---

# Payments and a low-cost paid plan

## Question

Should Lymi add an inexpensive subscription to pay for AI, starting with [adding cards from a lesson](adding-cards-from-a-lesson.md)? This is not yet a decision to charge, choose a provider or commit to a price.

## Current leaning

Core card creation, decks, review, enrichment, audio and access to learning data stay free. Reading lesson photos, and later AI features that cost real money per use, sit behind a monthly allowance: a small free one and a larger one on the paid plan. Extraction through a connected app stays free, because the client's model does the work.

Enrichment stays free because it is part of typing a card and costs about $0.003 per ten cards on GPT-6 Luna at high effort. Gating it would make the core worse to save almost nothing.

A price around €4 a month with an annual option is a hypothesis. A €4 charge in Germany leaves €3.36 after VAT and about €2.88 after fees. A photo costs about €0.005 to read, so even 200 photos a month cost under €1.

## Provider: Stripe Managed Payments

Stripe Managed Payments makes Stripe the merchant of record, so it collects and files VAT and sales tax worldwide. It was the cheapest merchant of record at this price on 11 October 2026, and it works with the first-party `@better-auth/stripe` plugin, which runs on Workers.

| Option | Fee | On €4 a month | On €36 a year |
|---|---|---|---|
| Stripe Managed Payments | 1.5% + €0.25, + 3.5%, + 0.7% Billing | €0.48 (12%) | €2.30 (6.4%) |
| Creem | 3.9% + $0.40 | €0.50 (12.5%) | €1.75 (4.9%) |
| Dodo Payments | 4% + $0.40, + 1.5% non-US card, + 0.5% | €0.59 (14.6%) | €2.51 (7.0%) |
| Paddle | 5% + $0.50 | €0.63 (15.8%) | €2.23 (6.2%) |
| Polar, Starter | 5% + $0.50, + 1.5% non-US card | €0.69 (17.3%) | €2.77 (7.7%) |
| Stripe Billing and Tax, Lymi as seller | 1.5% + €0.25, + 0.7%, + 0.5% | €0.36 (9%) | €1.22 (3.4%) |

Selling directly saves €0.12 a charge and costs quarterly OSS filings once cross-border EU sales pass €10,000 a year, plus a UK registration from the first sale. Not worth it for one person.

Risks to check before building:

- Stripe reviews eligibility, and its pages do not say whether a sole proprietor passes. Apply first.
- Managed Payments works only through Checkout. The page says "Sold through Link" and statements read `LINK.COM*`.
- The plugin's plan changes are untested with Managed Payments.
- Russian-issued cards fail with every provider in the table.

Creem is the runner-up: cheapest on the annual charge and close on the monthly, but a young company with no RevenueCat support.

## The allowance lives in D1

No provider gates usage in real time. Polar's credits, Stripe's billing credits and Autumn all leave enforcement to the app, and Autumn puts an API call in front of every check. So Lymi keeps it:

- The plugin's subscription row says which plan a learner is on.
- A usage row per learner, month and kind counts photo reads. A read checks and increments it in the same statement, so a retry cannot spend twice.
- A one-off credit pack, if one ships, adds to the same row from the Checkout webhook.

Requests read local state and never wait on Stripe. Webhooks are signed and idempotent, and a late or out-of-order event cannot downgrade a newer state.

## Mobile comes later

Ship web first. On iOS, Apple requires in-app purchase to unlock features. A US link to web checkout carries no commission while the April 2025 order stands, and the Supreme Court has taken Apple's appeal. EU link-outs pay 10 to 15%. Google Play takes 10% on subscriptions, 15% with its own billing.

When the native app sells, RevenueCat (free up to $2,500 a month of revenue, then 1%) handles the store purchases and writes to the same D1 entitlement. It supports Stripe on the web, which is one more reason to start there.

## Before launch

- Cancellation, failed payment, refund, account deletion and provider outage each have defined behavior. Cancelling keeps the plan to the end of the period, and cards already added are never touched.
- The sign-up screen's "Lymi is free to use" changes.
- Terms and the privacy page name Stripe and say what it processes.

## Open questions

- Is the photo read valuable enough to subscribe for? Test with the free allowance before any price.
- How large are the free and paid allowances?
- Does diagnosis count against the allowance, or stay free?
- Monthly and annual only, or a credit pack as well?
