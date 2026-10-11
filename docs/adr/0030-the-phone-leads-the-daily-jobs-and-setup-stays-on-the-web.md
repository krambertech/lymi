---
status: accepted
date: 2026-10-11
---

# The phone leads the daily jobs and setup stays on the web

Every learning feature reaches both the web app and the phone app, and the phone is built first for the daily jobs: reviewing, glancing at what is due, and catching a word. Five setup jobs stay on the web, and the phone shows each as a row that opens it there: import, export, API keys and connected apps, publishing, and deck reports. This narrows the parity rule in [ADR 0029](0029-the-phone-app-is-expo-react-native-sharing-core.md), which asked for every feature on both apps.

## Context

ADR 0029 made the phone a second set of screens over shared packages, so every screen built on the phone is built twice. PRODUCT.md says the phone and the desktop are the same product, not a main app and a companion. The learner reviews and captures on the phone most days; imports, exports, keys, publishing and deck reports happen a few times a year, involve files or long secrets, and are done at a desk.

## Considered options

- **Every screen on both, in time:** rejected. It spends phone work on screens opened rarely and with a keyboard nearby, ahead of the daily jobs.
- **Every learning feature on both, setup on the web:** accepted. Rules and data stay the same everywhere, and nothing the learner studies with is missing from the phone.
- **A companion app for review and capture only:** rejected. It is the main-app-and-companion split PRODUCT.md rules out, and the library would be read-only on the phone.

## Consequences

- A new learning feature ships on the web first by default, is verified there, and reaches the phone through a linked phone issue. The web deploys continuously while the phone ships as releases, so the web is where a feature settles before it is built twice.
- The API stays compatible with installed phone versions, and the phone tolerates fields and kinds it does not know yet, because it regularly runs behind web-first features.
- A setup job is web-only until learners reach for it on the phone; moving one is a product decision, not a parity bug.
- The phone's You and Settings show the five jobs as rows that open them on the web.
- The order of phone work follows the daily jobs: the review loop and capture before Insights, Explore and shared-deck management.

[Proposal: native mobile app](../proposals/native-mobile-app.md)
