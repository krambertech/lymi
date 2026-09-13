---
name: translate
description: |
  Translate and maintain Lymi's Ukrainian and Russian Lingui catalogs, and transcreate the public site's copy. Use when interface or site strings change, catalogs have empty entries, or a localization check fails.
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

## Site copy is transcreated

The landing and Join pages in `apps/site` explain Lymi to someone who has never used it. A faithful translation that reads like a translation fails that reader. For site catalogs, write what a native copywriter would write for the same reader and the same job; this replaces "translate meaning, not English syntax". The rest of the translation bar still applies.

1. **Name each block's job.** Before writing, state in one line who reads the headline, paragraph or button and what it should make them understand or do, using [`PRODUCT.md`](../../../PRODUCT.md). The job is the source; the English wording is one way to do it.
2. **Fix the message boundaries.** A headline or paragraph split across several `<Trans>` or `msg` messages locks the translation to English sentence order. Wrap the whole headline or paragraph as one message in the component, run `pnpm i18n:extract`, then write.
3. **Draft candidates for the lines that sell.** For each headline, subheading, call to action, page title, meta description and Open Graph or Twitter text, write two or three candidates that take different angles. Put your recommendation in the catalog. List all of them in the pull request with the block's job and one line on what each trades, so Kateryna picks. Body paragraphs get one version.
4. **Change the wording, keep the substance.** Idiom, metaphor, sentence order, rhythm and which detail leads are free to change. Every product fact stays exactly as the English states it: add no feature, promise or number, and drop none. Keep the calm voice from [`DESIGN.md`](../../../DESIGN.md): no hype, urgency or exclamation marks.
5. **Use the reader's search words in metadata.** The page title and meta description use the phrase a Ukrainian or Russian speaker would search for, which may not match the English. Visible copy still follows the glossary.
6. **Write each language from the job.** Draft the Russian from the English and the job, never by adapting the Ukrainian, and the reverse. The two readers need different idioms.
7. **Read it cold.** Read each block as a native speaker who has never seen the English. Rewrite any phrase that only makes sense when translated back. Flag a headline that may wrap badly at phone width for visual review.

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
| daily goal | денна мета | дневная цель |

Add a row when a durable product term appears.

## Verify and hand off

1. Run `pnpm verify`.
2. In the pull request or handoff, list uncertain translations and the strongest alternative considered.
