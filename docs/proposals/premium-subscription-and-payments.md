---
status: exploration
date: 2026-09-06
decision: none
---

# Payments and a low-cost paid plan

This note captures some early research into what it might take to add payments to Lymi. It is not a decision to introduce a paid plan, use a particular provider, put specific features behind payment, or commit to a price.

The question behind the research was fairly simple: if Lymi eventually had premium features such as AI enrichment, pronunciation audio, or sharing, how difficult would it be to charge something intentionally inexpensive for them?

## Where the thinking is currently

The rough price that feels interesting is **€3 per month, with applicable VAT added on top**. This is a working thought rather than validated pricing. How the price needs to be displayed to consumers, and whether an annual option would make sense, still need to be checked.

Technically, adding payments to the current web app does not look especially difficult. Lymi already has users, authentication, and clear server-side paths for AI and audio. The more meaningful work would be around subscription lifecycle, tax, usage limits, and making sure access stays correct when payments fail or subscriptions are cancelled.

The current leaning would be to explore a merchant-of-record provider first. Polar looks like the most straightforward candidate from the initial research, mostly because it handles international indirect tax and has an official Better Auth integration. That is not a provider selection yet.

## Why a paid plan might be useful

AI enrichment and text-to-speech have ongoing usage costs. Sharing or collaboration could also become part of a more valuable paid experience later. A small subscription could make those features sustainable while leaving the core learning loop accessible.

There is no settled free-versus-paid split. One possible shape could be:

- Free keeps card creation, decks, FSRS review, and access to existing learning data.
- Premium includes an allowance for AI enrichment and generation of new pronunciation audio.
- Sharing could eventually be premium, although the sharing feature itself would need separate product and data-access thinking.

It may make sense for previously generated audio to remain playable after someone downgrades. Lymi already caches audio in R2, so replaying it has negligible marginal cost. This is an example of the kind of product detail that would need to be decided, not a requirement established by this note.

## What the pricing research suggests

€3 per month is possible, but fixed transaction fees matter quite a bit at that price.

Polar's current Starter pricing is 5% + $0.50 per transaction, with an additional 1.5% for non-US cards. The exact proceeds from a €3 subscription would depend on the buyer's VAT rate, card location, currency conversion, and payout setup. The fixed fee would still take a noticeable share of each monthly payment.

An annual option could reduce the effect of that fixed fee. There is no annual price in mind yet, and offering one is still an open question.

The other unknown is actual AI and audio usage. A €3 plan probably should not promise unlimited usage before there is data on:

- the average model cost of enriching a card;
- how often people generate new audio;
- the difference between typical and heavy usage;
- retries, failures, and possible abuse;
- the margin that would make the plan sustainable.

A simple included allowance may be enough, but the numbers would be easier to choose after measuring real usage.

## Providers looked at

### Polar

Polar currently looks like the easiest starting point to explore.

It acts as merchant of record, supports payouts to individuals or businesses in Estonia, and provides subscriptions, hosted checkout, a customer portal, webhooks, benefits, and usage meters. Its official Better Auth integration is particularly relevant because Lymi already uses Better Auth.

The trade-off is the fee structure. The fixed $0.50 fee is meaningful on a €3 monthly subscription, and non-US card and payout fees may also apply.

### Direct Stripe

Direct Stripe has lower payment-processing fees for standard EEA cards and also has an official Better Auth subscription plugin.

The main difference is responsibility. With direct Stripe, Lymi would remain the merchant of record. Stripe Tax can help calculate tax, but the business would still need to understand its registration, filing, and remittance obligations. That may be more administration than makes sense for an early, inexpensive subscription.

### Stripe Managed Payments

Stripe Managed Payments is worth keeping an eye on. It supports eligible digital products, subscriptions, and businesses based in Estonia, with Stripe acting as merchant of record. Its published fee is 3.5% in addition to normal Payments fees, which may produce better economics than Polar at a low price.

It is currently described as a public preview and uses Managed Payments-specific Checkout configuration and API versions. Before treating it as a real option, it would be useful to confirm availability for the account, subscription lifecycle behavior, and how cleanly it works with Better Auth.

## What implementation could involve

If this idea moves forward, a basic checkout could be small. A more complete version would probably include:

- hosted checkout and a hosted billing portal;
- a connection between the provider customer and the Lymi user;
- signed, idempotent webhooks for purchases, renewals, cancellations, refunds, and failed payments;
- a local view of subscription status in D1 so normal requests do not depend on a live provider call;
- server-side feature checks shared by the web app, API, and MCP;
- usage measurement for AI enrichment and new audio generation;
- a way to reconcile local state if a webhook is delayed or missed;
- clear pricing, renewal, cancellation, privacy, and refund information.

The current codebase already has useful places for this logic. Better Auth is created centrally, and AI enrichment and pronunciation audio each go through a server-side service. That makes a future entitlement check additive rather than a rewrite.

Some lifecycle questions would still need care:

- Does access continue until the end of a cancelled billing period?
- Is there a grace period after a failed payment?
- What happens after a refund or chargeback?
- Can someone delete an account while a subscription is active?
- What happens if the payment provider is temporarily unavailable?
- How are duplicate or out-of-order webhooks handled?

These are the parts that make a payment integration reliable. They are not reasons not to do it, but they make the work larger than adding a checkout button.

## Rough effort

Based on the current stack, a working web checkout could likely be demonstrated quickly. A version that also covers subscription state, cancellation, failures, refunds, usage checks, customer self-service, and tests feels more like **three to five focused engineering days**.

Provider verification, policy preparation, and live end-to-end testing could make the elapsed time closer to one or two weeks. This is an early estimate, not a delivery commitment.

A future native iOS or Android app would bring separate app-store payment rules and economics. This research only considers the current web PWA.

## Questions still open

1. Is there enough value in AI, audio, sharing, or another feature to introduce Premium at all?
2. Does €3 per month plus applicable VAT feel right once it is tested with potential users?
3. How should that price be displayed for consumer sales in the markets Lymi serves?
4. Should there be an annual option, and what discount would make sense?
5. Should Free include a small AI and audio allowance?
6. What usage level can €3 sustainably support?
7. Is Polar the right trade-off between simplicity and fees, or is Stripe Managed Payments mature enough to consider?
8. Would Premium launch with AI and audio alone, or only once another paid feature exists?

## Sources checked

- [Polar fees](https://polar.sh/docs/merchant-of-record/fees)
- [Polar merchant-of-record coverage](https://polar.sh/docs/merchant-of-record/introduction)
- [Polar supported payout countries](https://docs.polar.sh/merchant-of-record/supported-countries)
- [Better Auth Polar integration](https://better-auth.com/docs/plugins/polar)
- [Better Auth Stripe integration](https://better-auth.com/docs/plugins/stripe)
- [Stripe pricing for Estonia](https://stripe.com/en-ee/pricing)
- [Stripe Managed Payments](https://docs.stripe.com/payments/managed-payments)
- [Stripe Managed Payments setup](https://docs.stripe.com/payments/managed-payments/set-up)
