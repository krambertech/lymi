---
status: in_progress
date: 2026-10-17
decision: Every email is rendered by Lymi with React Email and Lingui and delivered by Resend; three learning and news emails join the account emails, each with its own switch and one-click unsubscribe.
---

# Email that looks like Lymi

A learner should recognise an email from Lymi before reading it, find the one thing it asks in a single button, and stop any email that is not about their account with one click. Today every email is a few `<p>` tags with a bare link, and Lymi never writes unless the learner just did something. This proposal gives every email the same layout and adds three scheduled emails: an away reminder, the learner's month, and product news.

## Decisions

- **Resend delivers everything.** Cloudflare Email Service supports transactional email only ([FAQ](https://developers.cloudflare.com/email-service/reference/faq/), checked 2026-10-17), so news cannot go through it. Splitting providers would keep account email free but run two paths; one path also gives account email the bounce and complaint reports it lacks today. Account email sends from `notifications@lymi.app` and the other three from `news.lymi.app`, to separate news complaints from sign-in mail. This replaces the transactional email decision in `docs/stack.md`.
- **Lymi renders, the provider only delivers.** No hosted templates, Broadcasts, Audiences or hosted unsubscribe page, so no addresses sit at Resend between sends and switching provider means rewriting the send call and the delivery webhook.
- **React Email with Lingui.** Templates are React components rendered in the Worker; their text is `<Trans>` in the product's English-source catalogs, so `pnpm i18n:check` covers email. Hand-written table HTML would require more maintenance across fifteen kinds in three languages; MJML lacks the needed Lingui support. Email colours are hex values generated from `packages/design/tokens.css` and checked by `pnpm check:design`, because email clients do not read OKLCH.
- **No open or click tracking.** Apple Mail prefetches pixels and rewritten links send a reset email through someone else's domain. Links carry `from=email-<kind>` instead, which the product reads into `app_opened`.

## The emails

| Kind | When | Switch |
| --- | --- | --- |
| Account (9 kinds) | The learner asked | None |
| Invitation | An owner invited the address | None |
| Away reminder | 7 and 30 days after the last review, then not until the next review | Away reminders |
| Your month | First Tuesday, 10:00 learner time, for the month before; not sent after a month with no reviews | Your month |
| What's new in Lymi | Third Tuesday, 10:00 learner time; not sent when no changelog update was published since the last issue | Product news |

- **Away reminder.** Words only, plus up to three terms the learner has reviewed, important cards first, from decks they still study, without meanings. No counts and no streak, per [PRODUCT.md](../../PRODUCT.md) and [voice](../design/system/voice.md). The 30-day email says it is the last.
- **Your month.** The month as a calendar in the streak modal's marks, then Insights' Reviews, Recall, Cards added and Known with their plain lines, and one card that kept slipping. It follows [Insights](../design/insights.md): figures in the theme's text colour, with amber only for counted days.
- **What's new in Lymi.** The changelog updates since the last issue in the learner's app language, the newest with its picture, then three Explore decks in the learner's learning language. Operators get it a day early.

## Choices

All three switches are on by default, in Settings and the phone's You tab. Sign-up says Lymi sends them; an existing account's first one says why it arrived. Every such email carries `List-Unsubscribe` and `List-Unsubscribe-Post` (RFC 8058) and a footer link, each turning off only that email. Default-on news for existing accounts that were not told remains the owner's decision, pending a legal check of the EU soft opt-in rules.

## Design

One frame: the brand lantern and plain wordmark, the warm canvas, one plate, one amber button, and a footer saying why the email came. Each kind has one picture of its own: the lantern in its pool for account email, the deck's cover in its Explore hue for an invitation, the learner's fanned cards for the away reminder, the calendar for Your month. The pool ships as one static image; fanned cards fall back to a straight stack in Gmail and Outlook, and Outlook desktop squares corners.

A local-only `/emails` page renders every kind with sample data in every language, both themes and two widths, the plain text beside the HTML, through the same renderer as production. Its **Send to my inbox** sends for real through Resend when `RESEND_API_KEY` is in `.dev.vars`, only to `OPERATOR_EMAILS`.

## Instrumentation

`email_sent` and `email_failed` {kind, language, errorClass}, `email_bounced` and `email_complained` {kind} from Resend's webhook, `email_unsubscribed` {kind, via: one_click | footer | settings}, and `from_email` on `app_opened`. No address, term or card text in any event. They answer whether email arrives, whether it bounces or receives complaints, whether learners unsubscribe, and whether it brings them back.

## Before the first non-account email

- Confirm the Resend plan covers marketing sends.
- The 150-a-day cap in `services/email.ts` guards account email; scheduled sends need their own budget.
- The privacy policy names Resend and says away reminders may include terms from the learner's decks.

## Delivery

1. **Foundation.** React Email layout and generated palette, the Resend adapter with its bounce and complaint webhook, `/emails`, the eleven existing kinds restyled, `docs/stack.md` and the privacy policy updated.
2. **Invitation.** The deck-cover design.
3. **Choices.** The preference table, the three switches on web and phone, the one-click unsubscribe endpoint and the sign-up line.
4. **Away reminder.**
5. **Your month.**
6. **What's new in Lymi.**
