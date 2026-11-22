# Smart add from a link

Smart add on the phone reading a pasted link. The server's rules for links, robots.txt and TDM are in `apps/web/src/server/services/lessons.test.ts`; this entry proves the phone's side. [The proposal](../../../../docs/proposals/cards-from-links-and-recordings.md) owns the behavior.

## Reach

Smart add's **Link** source, offered while the lesson has no pages or text yet.

## Drive

[`smart-add-link.yaml`](smart-add-link.yaml), as `learner` from Today: open Smart add, choose **Link**, paste a YouTube link, press **Done**, then **Find terms**. Once the refusal shows, press **Paste the transcript**, go back and close. Then open the seeded card from an article on its deck page.

## End state

The refusal names YouTube's captions and offers **Paste the transcript**, which opens **Lesson text** with the link gone. The card page's Source row shows the article's site, `news.example.org`, and opens the page. [`smart-add-link.mjs`](smart-add-link.mjs) checks the card still holds the article's URL.

## Gotchas

- The route checks that a reader is configured before it looks at the link, so `apps/web/.dev.vars` needs an `ANTHROPIC_API_KEY` and an `AI_GATEWAY_TOKEN`; placeholders are enough, since a YouTube link is refused before any model runs.
- The Worker asks YouTube's oEmbed for the title. Offline, the refusal comes without the title; the flow matches either.
- A real article needs Workers AI's `toMarkdown`, which is remote only, with the real key and token; an app preview has neither.
