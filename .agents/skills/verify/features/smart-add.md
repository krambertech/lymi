# Smart add

A learner turns lesson photos, PDFs, text or an article's link into cards. Lymi reads the material, may ask a question about what to keep, and lists the terms to choose from. Beta accounts have a daily limit.

## Reach

**Smart add** in the **Add** menu of a deck page or Today, and in a deck's menu. The account must be allowed to read lessons (`/api/lesson-reads/access`).

## Drive

[`smart-add.mjs`](smart-add.mjs), as `learner`, with the read, the access check and the answer check stubbed in the browser so no AI call runs: press **Find terms** with nothing added, read a pasted lesson, fail the answer check on the question step, retry it, add the chosen card. Then paste a YouTube link and take **Paste the transcript**, read a long article after agreeing to its count of lessons, add its card and open the card page. Last, reopen at the daily limit.

## End state

The empty press shows **Add a photo or PDF of the lesson, paste its text or a link.** A failed answer check shows an error beside **Show terms** and a retry reaches the list. The added card is in the deck's cards. The YouTube refusal names the video and the transcript button opens **Lesson text**. The long article's second request carries `reads` and no text. The article's card stores the sentence with field source `lesson` and the article's URL as its source, and the card page links to it by its site. At the limit **Find terms** is `aria-disabled`, keeps focus and is described by the notice.

## Gotchas

- The read is stubbed, so the recipe proves the client. The server's link rules, robots.txt and TDM refusals are in `services/lessons.test.ts`; a real read needs a local Worker with `ANTHROPIC_API_KEY`, `AI_GATEWAY_TOKEN` and a Cloudflare login for the remote Workers AI binding. A pull request's app preview has no AI Gateway or Anthropic key, so every read there, pasted text included, answers 503.
- The question step's **Show terms** only calls the answer check when a question has the learner's own answer, so the recipe types one under **Something else**.
