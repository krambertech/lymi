---
status: accepted
date: 2026-09-12
---

# App language is one stored setting, and meaning language follows it

`user_settings.app_language` is the language of the interface and of push reminders. It is seeded from the browser on the learner's first sign-in and changed under You. Changing it also writes `meaning_language`, so meanings and examples come out in the language the learner reads the app in. No screen shows meaning language on its own, and nothing else writes it: `meaningLanguage` is read-only in the settings response and is not accepted by `SettingsPatch` or MCP's `update_settings`. `appLanguage` is a closed enum, `en`, `uk` and `ru`, so a patch cannot store a language without a catalog.

## Considered options

- Follow the browser with no setting. Rejected: the Worker sends reminders with no browser present, and the phone and the desktop would disagree.
- Two independent settings. Rejected: a Ukrainian-speaking learner wants Ukrainian meanings without being asked twice, and every visible setting is a maintenance cost.
- One setting with a hidden meaning-language override. Deferred: the column and the API field stay, so an override is an additive change if a real learner needs one.

## Consequences

- `meaning_language` stays in the schema and in the settings response as a derived field. Integrations read it and cannot write it; the deferred override would reopen that write deliberately.
- A null `app_language` means the learner has not chosen yet. The client writes the browser pick once, and the Worker treats null as English. A stored value outside the enum falls back to English.
- The bare shell before sign-in (`/login`, `/consent`) follows the browser and ignores the stored `lymi-language`, which sign-out clears, so one account's language never carries into another on a shared browser.
