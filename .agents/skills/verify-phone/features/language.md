# Language

The account's app language, chosen on the phone. Meanings follow it, and the change holds on the web because it is the account's setting, not the phone's.

## Reach

The **You** tab, then the **Language** row, grouped with **Theme** below the daily reminder.

## Drive

[`language.yaml`](language.yaml), as `learner`: open **You**, choose **Українська** from the **Language** row, check that the row and its note now read in Ukrainian, then choose **English** again.

## End state

[`language.mjs`](language.mjs) reads `/api/settings`: it was saved after the flow began, and `appLanguage` and `meaningLanguage` are `en` again.

## Gotchas

- The row's accessibility label is the label and the choice, `Language: English`, and `Мова: Українська` once switched.
- iOS's own tab bar is missing from Maestro's hierarchy once a sheet has been open, so the flow does not assert its labels.
- The flow ends in English because the phone keeps its settings for five minutes: left in Ukrainian, the next feature's flow would open in Ukrainian even after the persona reset.
