---
name: translate
description: |
  Fill the Ukrainian and Russian Lingui catalogs for Lymi's product and site. Use when a pull request adds or changes interface strings, when `pnpm build` fails on a missing translation, or when someone says "translate the new strings", "fill the catalogs", or "update uk.po".
---

# Translate the catalogs

Lymi's interface text is English in the components. `pnpm i18n:extract` writes every message into `apps/web/src/locales/{uk,ru}.po` and `apps/site/src/locales/{uk,ru}.po`, with an empty `msgstr` for anything new. This skill fills those slots. The pull request diff is the review; there is no translation service and no draft flag. [ADR 0012](../../../docs/adr/0012-interface-text-is-english-source-translated-by-lingui.md) has the reasoning.

## Before writing

1. Read [`CONTEXT.md`](../../../CONTEXT.md). Its terms are the glossary; its avoid-list applies in every language.
2. Read the voice section of [`DESIGN.md`](../../../DESIGN.md). Lymi is calm, direct and on first-name terms with one learner.
3. Run `pnpm i18n:extract`, then open each `.po` and translate every entry whose `msgstr` is empty. Leave filled entries alone unless the English `msgid` changed.

## Rules

- **Informal address.** Ukrainian says "ти", Russian says "ты". Never "ви" or "вы" in product copy. Decided 12 September 2026; the reasoning is in the [localization plan](../../../docs/plans/2026-09-12-localization.md).
- **Keep every placeholder.** `{0}`, `{name}`, `{due, plural, ...}` and `#` are code. Move them to where the sentence needs them, never rename or drop them.
- **Write all plural forms.** Ukrainian and Russian need `one`, `few` and `many`, plus `other` for fractions. `1 картка`, `2 картки`, `5 карток`, `21 картка`. A translation with only `one` and `other` is wrong.
- **Stay phone-width.** A button label or a segmented control option must stay about as short as the English. Prefer a shorter synonym over a clipped label.
- **Never translate "Lymi".** Product names, deck names, terms and learner-written text are not in the catalogs.
- **One word per concept.** Use the glossary below the same way every time. Do not alternate synonyms for variety.
- **Keep the sentence shape.** A sentence in English stays a sentence; a label stays a label. Do not add punctuation, exclamation marks or explanation the English does not have.

## Glossary

| English | Ukrainian | Russian |
| --- | --- | --- |
| card | картка | карточка |
| term | термін | термин |
| meaning | значення | значение |
| example | приклад | пример |
| deck | колода | колода |
| Library (screen) | Бібліотека | Библиотека |
| Today (screen) | Сьогодні | Сегодня |
| You (screen) | Ти | Ты |
| Insights (screen) | Огляд | Обзор |
| Activity (screen) | Активність | Активность |
| review (the act) | повторення | повторение |
| grade | оцінка | оценка |
| archive (verb) | архівувати | архивировать |
| restore | відновити | восстановить |
| enrich | доповнити | дополнить |
| field source | джерело поля | источник поля |
| app language | мова застосунку | язык приложения |
| meaning language | мова значень | язык значений |
| reminder | нагадування | напоминание |
| streak / run | серія | серия |

Add a row when a new product word appears in the strings, and keep the row when the word is used again.

## After writing

1. Run `pnpm verify`. With `failOnMissing` on, the build fails on any slot still empty.
2. In the pull request description, list every message you were unsure about, with the alternative you considered. Those are the lines a reviewer reads first.
