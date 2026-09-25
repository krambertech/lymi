---
name: translate
description: |
  Translate and maintain Lymi's Ukrainian and Russian Lingui catalogs and transcreate site copy. Use when interface or site strings change, catalogs have empty entries, or a localization check fails.
---

# Translate Lymi's catalogs

English component text is the source. `pnpm i18n:extract` updates the Lingui catalogs in `apps/web` and `apps/site`; translations live in the Ukrainian and Russian `.po` files. See [ADR 0012](../../../docs/adr/0012-interface-text-is-english-source-translated-by-lingui.md).

## Workflow

1. Read [`CONTEXT.md`](../../../CONTEXT.md). Its terms are the glossary; its avoid-list applies in every language.
2. Read [the voice rules](../../../docs/design/system/voice.md): calm, direct and speaking to one learner.
3. Run `pnpm i18n:extract`. Fill empty or changed entries. Change an existing translation only when it contradicts the glossary, breaks a placeholder or plural form, or says something the English does not.

## Translation bar

- **Informal address.** Ukrainian says "ти", Russian says "ты". Never "ви" or "вы" in product copy.
- **Keep every placeholder.** `{0}`, `{name}`, `{due, plural, ...}` and `#` are code. Move them to where the sentence needs them, never rename or drop them.
- **Write all plural forms.** Ukrainian and Russian need `one`, `few` and `many`, plus `other` for fractions. `1 картка`, `2 картки`, `5 карток`, `21 картка`. A translation with only `one` and `other` is wrong.
- **Translate meaning, not English syntax.** Keep the message's function and tone, but use natural Ukrainian or Russian grammar. Do not add claims, urgency or celebration.
- **Keep controls concise.** When a control label comes out longer than the English, flag it for a 393 px check instead of cutting it into unnatural wording.
- **Never translate "Lymi".** Product names, deck names, terms and learner-written text are not in the catalogs.
- **Use product terms consistently.** Follow the glossary with the inflection and word order the sentence requires.

## Site copy is transcreated

Landing and Join copy in `apps/site` must read as if it was written in Ukrainian or Russian. For site catalogs, this replaces "translate meaning, not English syntax"; the rest of the bar applies.

1. **Start from the job.** Name who reads each block and what it should make them do, from [`PRODUCT.md`](../../../PRODUCT.md).
2. **Wrap whole units.** Make each headline and paragraph one message, then run `pnpm i18n:extract`.
3. **Offer candidates.** Write two or three for each headline, call to action, page title and social or meta description. Put your pick in the catalog and list all of them in the pull request, one line each.
4. **Keep the facts.** Change idiom, order and rhythm freely. Add or drop no feature, promise or number.
5. **Use search words in metadata.** The title and description use what a native speaker would search for.
6. **Write each language from the English.** Never adapt one translation into the other.
7. **Read it cold.** Rewrite anything that only makes sense in English.

## Glossary

| English | Ukrainian | Russian |
| --- | --- | --- |
| card | картка | карточка |
| term | термін | термин |
| meaning | значення | значение |
| example | приклад | пример |
| deck | колода | колода |
| Library (screen) | Бібліотека | Библиотека |
| series (group of decks) | серія | серия |
| section (part of a deck) | розділ | раздел |
| Today (screen) | Сьогодні | Сегодня |
| Explore (screen) | Каталог | Каталог |
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
| streak / run | дні поспіль (лік днів поспіль) | дни подряд (счёт дней подряд) |
| daily goal | денна мета | дневная цель |
| rest day | день відпочинку | день отдыха |
| AI | AI (never ШІ) | AI (never ИИ) |
| account (product interface) | акаунт | аккаунт |
| account (site legal pages) | обліковий запис | аккаунт |

Add a row when a durable product term appears.

## Verify and hand off

1. Run `pnpm verify:changed`.
2. In the pull request or handoff, list uncertain translations and the strongest alternative considered.
