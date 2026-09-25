# The docs site

The docs site at `/docs` is the same two rooms as the product. Pages are plain on the canvas, not in cards: a card in the docs means a code block, a callout, or one operation.

## Prose

Prose is `text-2` at 15.5 px (`text-md`) on a 44 rem column; headings and bold are `text`. The API reference gets 52 rem, because it carries field tables.

## Code

Code is set in `font-mono`, the one exception to Onest ([type.md](type.md#monospace)), and in ink and weight, never in colour. Three tones carry the syntax:

| Part | Colour | Weight |
| --- | --- | --- |
| A JSON key, which is what you scan for | `text` | 500 |
| A value | `text-2` | 400 |
| Comments and punctuation | `muted` | 400 |

Nothing in a snippet is `faint`; every character there carries meaning.

## The two colours the reference uses

The reference uses only the colours that already mean something:

- A response code is `good` for a 2xx and `danger` otherwise.
- An HTTP method is a neutral chip, except DELETE, which is `danger`.
