# Smart add

A learner turns lesson photos, PDFs or text into cards. Lymi reads the material, may ask a question about what to keep, and lists the terms to choose from. Beta accounts have a daily limit.

## Reach

**Smart add** in the **Add** menu of a deck page or Today, and in a deck's menu. The account must be allowed to read lessons (`/api/lesson-reads/access`).

## Drive

[`smart-add.mjs`](smart-add.mjs), as `learner`, with the read, the access check and the answer check stubbed in the browser so no AI call runs: press **Find terms** with nothing added, read a pasted lesson, fail the answer check on the question step, retry it, add the chosen card, then reopen at the daily limit.

## End state

The empty press shows **Add a photo or PDF of the lesson, or paste its text.** A failed answer check shows an error beside **Show terms** and a retry reaches the list. The added card is in the deck's cards. At the limit **Find terms** is `aria-disabled`, keeps focus and is described by the notice.

## Gotchas

- The question step's **Show terms** only calls the answer check when a question has the learner's own answer, so the recipe types one under **Something else**.
