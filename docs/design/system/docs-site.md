# The docs site

The docs site at `/docs` uses the product’s light and dark themes. Render prose directly on the canvas. Reserve panels for code blocks, callouts and individual API operations.

## Prose

Prose is `ink-secondary` at 15.5 px (`text-md`) on a 44 rem column; headings and bold are `ink`. The API reference gets 52 rem, because it carries field tables.

## Code

Code is set in `font-mono`, the one exception to Onest ([type.md](type.md#monospace)), and in ink and weight, never in colour. Three tones carry the syntax:

| Part | Colour | Weight |
| --- | --- | --- |
| A JSON key, which is what you scan for | `ink` | 500 |
| A value | `ink-secondary` | 400 |
| Comments and punctuation | `ink-muted` | 400 |

Nothing in a snippet is `ink-faint`; every character there carries meaning.

## The two colours the reference uses

The reference uses only the colours that already mean something:

- A response code is `success` for a 2xx and `danger` otherwise.
- An HTTP method is a neutral chip, except DELETE, which is `danger`.
