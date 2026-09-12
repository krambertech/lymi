---
name: translate
description: |
  Translate and maintain Lymi's Ukrainian and Russian Lingui catalogs. Use when interface strings change, catalogs have empty entries, or a localization check fails.
---

# Translate Lymi's catalogs

English component text is the source. `pnpm i18n:extract` updates the Lingui catalogs in `apps/web` and `apps/site`; translations live in the Ukrainian and Russian `.po` files. See [ADR 0012](../../../docs/adr/0012-interface-text-is-english-source-translated-by-lingui.md).

## Workflow

1. Read [`CONTEXT.md`](../../../CONTEXT.md). Its terms are the glossary; its avoid-list applies in every language.
2. Read the voice section of [`DESIGN.md`](../../../DESIGN.md): calm, direct and speaking to one learner.
3. Run `pnpm i18n:extract`. Fill empty or changed entries. Correct an existing translation only when it is clearly wrong or inconsistent.

## Translation bar

- **Informal address.** Ukrainian says "ти", Russian says "ты". Never "ви" or "вы" in product copy. Decided 12 September 2026; the reasoning is in the [localization plan](../../../docs/plans/2026-09-12-localization.md).
- **Keep every placeholder.** `{0}`, `{name}`, `{due, plural, ...}` and `#` are code. Move them to where the sentence needs them, never rename or drop them.
- **Write all plural forms.** Ukrainian and Russian need `one`, `few` and `many`, plus `other` for fractions. `1 картка`, `2 картки`, `5 карток`, `21 картка`. A translation with only `one` and `other` is wrong.
- **Translate meaning, not English syntax.** Keep the message's function and tone, but use natural Ukrainian or Russian grammar. Do not add claims, urgency or celebration.
- **Keep controls concise.** Prefer a short natural label. If space may be tight, flag it for visual review instead of distorting the translation.
- **Never translate "Lymi".** Product names, deck names, terms and learner-written text are not in the catalogs.
- **Use product terms consistently.** Follow the glossary with the inflection and word order the sentence requires.

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

Add a row when a durable product term appears.

## Verify and hand off

1. Run `pnpm verify`.
2. In the pull request or handoff, list uncertain translations and the strongest alternative considered.
