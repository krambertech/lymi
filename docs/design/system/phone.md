# The phone app

The phone app in `apps/mobile` takes the tokens, the lantern, the flame, the reveal, the end of a review and the moments in [motion.md](motion.md) from `packages/design`, and keeps the web's component names, Onest and Lucide. This file lists only where the phone differs, each time because touch or iOS gives it a better way. Lymi draws its persistent chrome; Apple draws what comes and goes: long-press menus, ⋯ menus, the share sheet, alerts, the keyboard and permission prompts ([ADR 0029](../../adr/0029-the-phone-app-is-expo-react-native-sharing-core.md)). Which jobs the phone leads is in [PRODUCT.md](../../../PRODUCT.md#surfaces).

## Navigation

- The tabs are a bar in Liquid Glass, tinted toward the room and opaque before iOS 26. Every tab carries its label, an icon over the word, as iOS lays out its own tab bars. Each tab names itself in the top bar beside the streak; there is no large title row. Tapping the current tab returns its stack to the top. The bar is being built and tuned in #549.
- **You** gathers what is about the learner: Insights first as one plate that opens the full page, then the reminder time and the theme, then Activity, Settings, feedback and sign-out. Archived closes Library.
- Capture is an amber-tinted glass circle at the end of the tab bar, the bar's height, in the thumb's reach. A tap opens Add a word.

## How a screen arrives

| Motion | For | Leaves by |
| --- | --- | --- |
| Push from the side | A page to read or work in: a deck, a card, a series, Insights, Activity, Settings, the streak, a deck in Explore | The named back, or a swipe from the start edge |
| Sheet from below | A task with an end: Add a word, New deck, Edit card, a choice list, the card menu in a review, the reminder time | A swipe down, with detents where the task grows |
| Cover from below | A mode that takes the screen: a review, Welcome and sign-in | X, or pulling the top bar down |

This is [overlays.md](overlays.md)'s rule in iOS's own navigation: from the side means back, from below means swipe down.

## Review

- Grades are four plates under the card, 80 pt tall and nearly square, and the card shrinks to make room.
- X is a plain icon button with a 44 pt target and no glass disc, because leaving is rare.
- Pulling the top bar down follows the finger and, past a third of the screen, ends the review on the end screen, as X does. Today shows behind it as it moves.
- A swipe from the start edge brings the last graded card back, revealed and waiting for a grade, and removes that grade. It goes back one card. The pointing hand shows it once, on a learner's second card ever; VoiceOver offers it as an action on the card.
- After a grade the flame breathes and sparks from the hood, as on the web.
- At the end the lantern's light reaches the edges of the screen. Review forgotten leads with the Forgot mark, as on the web.

## Haptics

A haptic answers a touch or marks the goal. These are all of them:

| Moment | Haptic |
| --- | --- |
| Reveal | Light impact |
| Every grade, Forgot included | Soft impact |
| Undo, or crossing the line while pulling to end | Selection |
| The daily goal | Success |
| The end of a review | A faint tick under each ember and one warm pulse as today's light fills, through Core Haptics |
| Starting a review | Medium impact |

## Sound

One sound, when the daily goal is reached. It follows the silent switch, and You has a setting to turn sound off entirely.

## Glass

Liquid Glass suits Lymi: it is a material that holds light, and the lantern is a light. The phone uses it for chrome that floats over content, so the bar and the capture circle refract what scrolls beneath them and morph as the learner moves. Tinted amber, glass marks the one standing action, as plain amber marks a press on the web. Where else tinted glass carries Lymi's light is open, to try on a device rather than in mockups. Glass never sits behind the card in a review or behind text that has to be read. Reduce Transparency, and iOS before 26, get the web's opaque surfaces. The web keeps its opaque pill.

## Light

The big lantern on Today catches a highlight across its glass as the phone tilts, as iOS 26's own glass does. It is the only tilting thing, and Reduce Motion turns it off.

## Outside the app

- **Widget:** one widget, two sizes. Small is the lantern with what is due; medium is the Week, the run and seven glasses with the due count. Both open a review. In a tinted or clear Home Screen the lantern has its own one-colour drawing.
- **Lock Screen:** a ring for today's goal around the due count, and a line with the count, the goal and the run.
- **Controls:** Add a word and Review, for Control Center, the Lock Screen and the Action button.
- **Reminder:** one ordinary notification at the learner's time, only while the day is open and something is due. It says how many cards are due and offers Review now and In an hour. It never mentions the streak, because PRODUCT.md rules out streak pressure.
- No Live Activity for now.
