---
status: exploration
date: 2026-09-13
decision: none
---

# Search and AI discovery for lymi.app

This proposal audits how `lymi.app` presents itself to search engines and AI answer engines, and recommends what to do next while Lymi is in closed beta. It refines the search layer of [Market differentiation and go-to-market](market-differentiation-and-go-to-market.md#seo-strategy-for-a-low-maintenance-launch) with evidence from the current build; it does not decide the content calendar, the AI-training crawler stance, or whether comparison pages publish before the public beta.

The audit reads the site built from this commit on 13 September 2026. The live origin was not reachable from the audit environment, so Search Console, Bing, Cloudflare dashboard state and live response headers remain to be checked by hand. A public web search for `lymi.app` returned no result from the site, which is consistent with the go-to-market audit's empty `site:` check a week earlier.

## Where the site stands

**Sound foundations.** Every public page is prerendered with its full copy in the HTML, so crawlers that do not run JavaScript still read the landing page and the docs. Each page has a unique title, description and absolute canonical. The landing and Join pages carry `hreflang` for `en`, `uk`, `ru` and `x-default` with matching `<html lang>`. The landing page emits `SoftwareApplication` JSON-LD, `robots.txt` points at the sitemap, unknown paths return a real 404 with `noindex`, and the product origin is `noindex` throughout. Fonts are self-hosted and there are no broken images because there are no images.

**Gaps, in order of cost to traction.**

1. **Indexing is unverified.** Nothing in the repository or the public web shows that Google or Bing know the domain. Everything else in this proposal is moot until ownership is verified and the sitemap is processed.
2. **The page never names its category.** Across the rendered landing copy, "vocabulary", "spaced repetition", "flashcards" and "language learning" appear zero times; the title is `Lymi · Keep what you learn`. A search engine or an assistant asked for "a spaced repetition app for lesson vocabulary" has nothing to match. The headline can stay: the lead paragraph, the title and the description are where the category words belong. `CONTEXT.md` still governs word choice, so "flashcard" stays out and "cards", "vocabulary" and "spaced repetition" go in.
3. **Nothing targets a query.** Nineteen URLs, all brand or reference. The go-to-market proposal's high-intent themes ("Anki alternative for language learners", "save vocabulary from ChatGPT", "spaced repetition for Finnish") have no page yet, and the landing plan's `/languages` page ([issue 94](https://github.com/krambertech/lymi/issues/94)) is the only vertical page shaped so far.
4. **The product origin blocks crawling and asks for `noindex` at once.** `my.lymi.app/robots.txt` disallows everything, so Google never fetches the `noindex` meta that every product page sends. Google documents that a blocked URL can still be indexed from its links alone, and every landing page links to `https://my.lymi.app/` as **Open Lymi**. The reliable version is an `X-Robots-Tag: noindex` response header on product HTML with the shell left crawlable, keeping `/api/` and `/mcp` disallowed.
5. **The sitemap is a hand-kept list.** No `lastmod`, no `xhtml:link` alternates for the localized pages, and drift is already visible: `/brand/` is built and indexable with a generic title but absent from the list. `@astrojs/sitemap` with its `i18n` option generates both from the routes.
6. **Structured data describes the app but not the entity.** There is no `Organization` (Krambertech OÜ, logo, `sameAs`) or `WebSite` node, docs pages have no `TechArticle` or `BreadcrumbList`, and `og:locale` is missing. Entity clarity is what an answer engine uses to reconcile "Lymi" with this site rather than the unrelated "Language Lantern" apps that a search for the name returns today. `aggregateRating` stays out until real reviews exist; a fabricated one violates Google's guidelines.
7. **One island hydrates the whole landing page.** `LandingPage` is `client:load`, so React, Motion and Lingui, about 430 KB of JavaScript, run on every visit before any demo is pressed. Crawling is unaffected because the HTML is complete, but interaction latency on phones is, and Core Web Vitals is a ranking input. Copy sections can be static Astro; each demo can be its own `client:visible` island.
8. **No Bing, no IndexNow, no measurement.** ChatGPT search grounds on Bing's index, so a page absent from Bing is invisible there regardless of Google rank. There is no referrer or campaign capture, so a visit from `utm_source=chatgpt.com` or a Perplexity citation cannot be attributed.
9. **The AI crawler stance is implicit.** `robots.txt` allows everything, which is fine, but Cloudflare now manages AI crawlers per zone and changes its defaults for new zones from 15 September 2026. The search category (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`) is reported as allowed by default; training and agent categories are not. The dashboard setting for `lymi.app` needs a deliberate check.

## What the 2026 evidence says

Dated 13 September 2026; each point may change.

- Google's own guidance for AI Overviews and AI Mode is that a page eligible for a normal snippet is eligible for AI features, with no extra markup, text file or Markdown needed ([AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)). Search Console's Generative AI performance report rolled out worldwide on 31 August 2026 and shows impressions and cited pages but no queries or clicks ([announcement](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)).
- ChatGPT search and Copilot cite from Bing's index; Bing Webmaster Tools' AI Performance report is the free way to see citation share, and IndexNow shortens the publish-to-index lag from weeks to hours ([Stackmatix guide](https://www.stackmatix.com/blog/bing-webmaster-tools-chatgpt)).
- OpenAI, Anthropic and Perplexity each run separate search, training and user-fetch crawlers with their own user agents, so search visibility and training can be decided independently ([OpenAI crawler docs](https://developers.openai.com/api/docs/bots), [Anthropic crawler docs](https://support.anthropic.com/en/articles/8896518)). `Google-Extended` governs Gemini training, not AI Overviews.
- Answer engines cite third-party pages far more than brand sites for comparative questions: Perplexity leans on Reddit and YouTube, ChatGPT on Wikipedia and roundups, and Ahrefs found only 12% of AI-cited URLs overlap Google's top ten ([Profound](https://www.tryprofound.com/blog/ai-platform-citation-patterns), [Orbit Media](https://www.orbitmedia.com/blog/ai-citation-sources/)). Being named accurately in the existing "Anki alternatives" roundups is worth as much as ranking a comparison page of Lymi's own.
- `llms.txt` is not read by Google and the maintainers of the most thorough SEO skill call it "not currently a citation lever" ([claude-seo](https://github.com/AgriciDaniel/claude-seo)). It is cheap and harmless, so it is optional, not a lever.
- The reusable skill material worth borrowing: [kpab/seo-mastery-agent-skills](https://github.com/kpab/seo-mastery-agent-skills) has `astro-seo.md`, `edge-seo.md` for Cloudflare Workers and an eight-stage audit workflow; [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) covers passage-level citability and `hreflang` audits; [seranking/seo-skills](https://github.com/seranking/seo-skills) and [JeffLi1993/seo-audit-skill](https://github.com/JeffLi1993/seo-audit-skill) show deterministic checks a script can run against a build. A small repo skill that runs the build-output checks in this proposal is more useful to Lymi than installing any of them whole.

## Options

**A. Technical hygiene only.** Verify ownership, fix items 1, 4, 5, 6, 7, 8 and 9. About a week of small pull requests. Necessary and cheap, but a correctly indexed site with nothing to rank for gains only brand searches.

**B. Hygiene plus a small high-intent corpus.** Everything in A, then eight to twelve durable pages over roughly sixty days, each answering one job with real product evidence, plus a measurement loop that retires pages that attract visits but no activated learners. Recommended; it is the go-to-market proposal's Priority 1 made concrete.

**C. Programmatic catalog pages.** The public deck library ([ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md), slice 5 of [its plan](../plans/2026-09-13-public-deck-library-and-progressive-series.md)) gives localized series and deck pages with their own `hreflang`, sitemap entries and structured data. This is the long-tail layer and it already has a plan; it should follow B, not replace it, because a catalog of pages nobody searches for is indexing without demand.

## Current leaning

Do A this month, B over the next two, and let C ride the deck library plan. The detailed A checklist is:

1. Verify `lymi.app` in Google Search Console and Bing Webmaster Tools with a DNS record, submit the sitemap, inspect the landing, `/uk/` and one docs URL, and check the Cloudflare AI Crawl Control panel. Record the outcome in this proposal.
2. Put the category words into the landing lead, title and description in all three locales through the existing Lingui catalogs; leave the headline.
3. Replace the hand-written sitemap with `@astrojs/sitemap` (`i18n`, `lastmod`) and mark `/brand/` `noindex`.
4. Add `Organization` and `WebSite` JSON-LD to `BaseLayout`, `TechArticle` plus `BreadcrumbList` to docs pages, and `og:locale` with alternates.
5. Send `X-Robots-Tag: noindex` from the product Worker and narrow its `robots.txt` to `/api/` and `/mcp`, updating `e2e/origin-boundary.spec.ts`.
6. Split the landing island so copy is static and demos hydrate on view; measure with Lighthouse before and after.
7. Add a build-output check to `pnpm verify` that every HTML page has a unique title, description and canonical, appears in the sitemap and has no stray `noindex`; this is the seed of a repo `seo-check` skill.
8. Add privacy-safe analytics with referrer and UTM capture (Cloudflare Web Analytics is cookieless and free) and ping IndexNow from `deploy:ci`.

For B, the first pages, in order: `/languages` from the landing plan; "How to keep the vocabulary from a language lesson"; "Save vocabulary from ChatGPT" and "from Claude" as the MCP guides' public faces; the honest Anki comparison once the side-by-side test in the go-to-market proposal is done; one Ukrainian guide, because Google holds about 85% of Ukrainian search and the localized landing already exists; and a `/changelog` with an RSS feed, which gives assistants and returning visitors a dated record of what changed. Each page follows the go-to-market rules: one intent, a direct answer in the first paragraph, a real workflow, limitations, a date and one beta call to action.

Across A and B, work the entity as much as the pages: keep one description of Lymi on GitHub, the MCP registry, the ChatGPT and Claude directories ([MCP directory review](../mcp-directory-review.md)), AlternativeTo and Product Hunt, and ask for accurate listings in the roundups that answer engines already cite.

## Measurement

Indexed pages and coverage errors in both consoles; non-brand impressions and the Generative AI report in Search Console; citation share in Bing; referrals from `chatgpt.com`, `perplexity.ai` and `claude.ai`; beta requests by landing page; and activation by source once the funnel measurement from the go-to-market proposal exists. A page stays if it produces activated learners within a quarter; otherwise it is improved once, then merged or removed.

## Open questions

- Should `GPTBot`, `ClaudeBot` and `Google-Extended` be allowed? Allowing search crawlers is the recommendation; training is a stance the owner takes.
- Do comparison pages wait for the small public beta stage, as the go-to-market proposal suggests, or publish earlier with the beta clearly stated?
- Who approves Ukrainian and Russian guide copy, given the `translate` skill's rule that machine drafts need a fluent reviewer?
- Which analytics tool, and does its data land in the Insights or Activity surfaces or stay operational?

The choice needed to proceed is confirming option B and the two-month horizon; the A checklist can start without it.
