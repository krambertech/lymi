---
status: in_progress
date: 2026-10-17
decision: Every email is rendered by Lymi with React Email and Lingui and delivered by Resend; three learning and news emails join the account emails, each with its own switch and one-click unsubscribe.
---

# Email that looks like Lymi

A learner should recognise an email from Lymi before reading it, find the one thing it asks in a single button, and stop any email that is not about their account with one click. Today every email is a few `<p>` tags with a bare link, and Lymi never writes unless the learner just did something. This proposal gives every email the same layout and adds three scheduled emails: a learning email, the learner's month, and product news.

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
| Learning email | The series below, from the learner's last review | Learning emails |
| Your month | First Tuesday, 10:00 learner time, for the month before; not sent after a month with no reviews | Your month |
| What's new in Lymi | Third Tuesday, 10:00 learner time; not sent when no changelog update was published since the last issue | Product news |

- **Learning email.** It leads with what is ready, and one card is the example: "10 cards to review", then the card on a loose pile, ending in its button. No count of cards reviewed, no streak, no guilt, and nothing that says their words came back on day one, because a Good card is not due for 2 days. The card is what review would ask next, in the direction it would ask; a card with a picture or a reading gives way to a plain one, and with none the email keeps its heading and goes straight to Review. Cards from any deck show in full, private decks included: the learner's decision on 1 November 2026.

| Who | Day 1 | Day 3 | Day 7 | Day 30 |
| --- | --- | --- | --- | --- |
| Reviewed one day, no reminders on | Next cards, teaching a new one if nothing is due | The same | Pick up where you left off | The last one, and it says so |
| Reviewed on more days | None | None | Pick up where you left off | The last one |
| Added a deck, never reviewed | Start the deck, first card with both sides | How a review works | None | None |
| No cards | Add your first cards | None | None | None |

Days count from the last review, so a return resets the series. Learners with several decks get one email, counted across them, and the card names its deck.

**Flip.** The button is a link, because Gmail strips the code an in-email flip needs. It opens a signed, expiring page showing that one card, which turns over by itself. A signed-in learner grades it and it counts, then review continues; anyone else presses Continue, signs in on the normal page and lands in Review. The link grades nothing, because mail scanners follow links. With only new cards the button reads Start and goes to Review.
- **Your month.** The month as a calendar in the streak modal's marks, then Insights' Reviews, Recall, Cards added and Known with their plain lines, and one card that kept slipping. It follows [Insights](../design/insights.md): figures in the theme's text colour, with amber only for counted days.
- **What's new in Lymi.** The changelog updates since the last issue in the learner's app language, the newest with its picture, then three Explore decks in the learner's learning language. Operators get it a day early.

## Choices

Each switch is on by default, in Settings and the phone's You tab; learning emails have theirs, in `user_settings` beside session replay. Sign-up says Lymi sends them. Every such email carries `List-Unsubscribe` and `List-Unsubscribe-Post` (RFC 8058) and a footer link, each turning off only that email; the footer link asks first, because mail scanners follow links. Whether existing accounts get them remains the owner's decision, pending a legal check of the EU soft opt-in rules (Inteligo Media, C-654/23), so `LEARNING_EMAILS_SINCE` starts them at a date of the owner's choosing.

## Design

One frame: the brand lantern and plain wordmark, the warm canvas, one plate, one amber button, and a footer saying why the email came. Each kind has one picture of its own: the lantern in its pool for account email, the deck's cover in its Explore hue for an invitation, the loose pile for the learning email, the calendar for Your month. The pool ships as one static image; fanned cards fall back to a straight stack in Gmail and Outlook, and Outlook desktop squares corners.

A local-only `/emails` page renders every kind with sample data in every language, both themes and two widths, the plain text beside the HTML, through the same renderer as production. Its **Send to my inbox** sends for real through Resend when `RESEND_API_KEY` is in `.dev.vars`, only to `OPERATOR_EMAILS`.

## Instrumentation

`email_sent` and `email_failed` {kind, language, errorClass}, `email_bounced` and `email_complained` {kind} from Resend's webhook, `email_unsubscribed` {kind, via: one_click | footer | settings | bounce | complaint}, and `from_email` on `app_opened`. No address, term or card text in any event. They answer whether email arrives, whether it bounces or receives complaints, whether learners unsubscribe, and whether it brings them back.

## Before the first non-account email

- Confirm Resend's terms cover learning emails on the transactional plan, and add `news.lymi.app`.
- Decide about existing accounts, then set `LEARNING_EMAILS_SINCE`.
- Decide what to do about Gmail's tabs: the first test sends landed in Promotions and Updates, none in Primary, and the unsubscribe headers did not change that.

## Delivery

1. **Foundation.** React Email layout and generated palette, the Resend adapter with its bounce and complaint webhook, `/emails`, the eleven existing kinds restyled, `docs/stack.md` and the privacy policy updated.
2. **Invitation.** The deck-cover design.
3. **Choices.** The preference table, the three switches on web and phone, the one-click unsubscribe endpoint and the sign-up line.
4. **Learning email.**
5. **Your month.**
6. **What's new in Lymi.**
