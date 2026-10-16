# Smart add

Smart add on the phone: lesson material in, read by the Worker's lesson reader while its terms stream in, a pick list out, and the ticked terms added as ordinary cards. [phone.md](../../../../docs/design/system/phone.md#smart-add) owns the design.

## Reach

A long press on **Add a card** in a tab's top bar, then **Smart add**; Library's plus; a deck's ⋯; or Welcome's **Turn your notes into cards**.

## Drive

[`smart-add.yaml`](smart-add.yaml), as `learner` from Today: long-press **Add a card**, choose **Smart add**, choose **Text**, type a short Estonian lesson, press **Done**, then **Find terms**. Once the list shows, open the first term, check **From the lesson** shows, close it, and press **Add** with the count in its name.

## End state

The sheet closes on the toast **Added … cards to** the deck. [`smart-add.mjs`](smart-add.mjs) waits for the learner's card count to grow by at least one and for a card whose term came from the lesson.

## Gotchas

- The read needs `ANTHROPIC_API_KEY` in `apps/web/.dev.vars`; without it the Worker refuses with 503 and the flow stops on the lesson step with the error under the sources. `env()` fails first, naming the missing key.
- A non-operator persona has 5 reads a day, so a sixth run in one day shows the limit notice instead; reset the persona or wait.
- The Simulator has no camera, so **Scan pages** shows as **Camera** there and is not driven; the document scanner is checked on a device.
- Photos and Files open iOS's pickers, which Maestro drives poorly; the flow uses Text, the same read path.
