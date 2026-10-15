# Card choices

The choices Add a word and Edit card open as sheets over the form: tags, typed or ticked from the deck's; how it's asked, whose picture modes show once the card has a picture ([ADR 0014](../../../../docs/adr/0014-review-modes-use-explicit-cues-and-targets.md)); and a picture description, which may not name the term or the meaning. Tags stay for the next card. The card page's Tags and Asked open Edit card on that sheet.

## Reach

**Add a card** in the top bar, then the **Tags**, **How it’s asked** and **Picture** chips over the keyboard. On a card's page, **Tags** or **Asked** under Details, or **Edit card** in its ⋯ menu.

## Drive

[`card-choices.yaml`](card-choices.yaml), as `learner` from Today: open **Add a card** with the AI off, write **il semaforo** and **the traffic light**, add the tags **street** and **city**, see that **How it’s asked** offers only Recognition and Production, choose the first photo and describe it as **the traffic light at a junction**, see the refusal under it, press **Add to** the deck and land back in the picture's sheet, describe it again without the answer, tick **Picture → term**, and add. The tags chip still reads **street**. Then in Library open the first deck, the card, its **Tags**, remove **city** and press **Save**.

## End state

The sheet confirms **Added “il semaforo” to** the deck. [`card-choices.mjs`](card-choices.mjs) finds the card with the tag **street** alone, the mode image → term, and the second description on its picture.

## Gotchas

- The chips run most recently used first, so [`_chip.yaml`](_chip.yaml) swipes the row until a chip shows. The row rides over the keyboard until the first sheet closes; after that the Simulator leaves the keyboard down and the row sits at the foot.
- iOS's photo picker is its own process: the first photo is tapped by position, then **Choose** keeps the crop.
- The description field's accessible name carries its placeholder, so it is found as **Description.***.
