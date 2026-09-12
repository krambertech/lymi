---
status: accepted
date: 2026-09-12
---

# App language is one stored setting, and meaning language follows it

`user_settings.app_language` is the language of the interface and of push reminders. It is seeded from the browser on the learner's first sign-in and changed under You. Changing it also writes `meaning_language`, so meanings and examples come out in the language the learner reads the app in. No screen shows meaning language on its own.

## Considered options

- Follow the browser with no setting. Rejected: the Worker sends reminders with no browser present, and the phone and the desktop would disagree.
- Two independent settings. Rejected: a Ukrainian-speaking learner wants Ukrainian meanings without being asked twice, and every visible setting is a maintenance cost.
- One setting with a hidden meaning-language override. Deferred: the column and the API field stay, so an override is an additive change if a real learner needs one.

## Consequences

- `meaning_language` stays in the schema and in `/api/settings`, so integrations can still read it.
- A null `app_language` means the learner has not chosen yet. The client writes the browser pick once, and the Worker treats null as English.
- The sign-in page has no settings to read, so it follows the browser.
