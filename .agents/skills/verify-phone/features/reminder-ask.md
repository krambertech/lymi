# Reminder question

A review's end asks when to remind the learner, once on a phone, so the reminder is not left unfound in You. `apps/mobile/src/review/reminder-ask.tsx` holds it; the rules are in [Getting started](../../../../docs/design/onboarding.md#on-the-phone).

## Reach

Finish or end a review that graded a card, on a phone where the reminder is off, iOS has never been asked about notifications, and the question has not shown before. The end's last button is **Next** in place of Done.

## Drive

[`reminder-ask.yaml`](reminder-ask.yaml), as `learner`: grade a card, end the review, press **Next**, choose **Morning**, press **Remind me at 08:00**, allow notifications, then see the reminder on in You. A second review ends on **Done**.

## End state

**You** shows **Remind me to review** on with its **Time** row. Two more reviews are stored. The lantern sits at the same place on the end and on the question: compare `01-end-with-next.png` and `02-question.png`.

## Gotchas

- It runs once per install. iOS remembers its answer and the phone remembers the question, and neither `simctl privacy` nor a persona reset clears them: uninstall with `xcrun simctl uninstall <udid> app.lymi`, then `stim ios` to install again.
- Run it before `reminders` and `review` on a fresh install; `reminders` grants the permission and `review` answers **Not now**, and either one ends the question for that install.
- Dev sends nothing to PostHog, so `reminder_ask_left` and the prompt events are proved by the catalog's types, not by this flow.
