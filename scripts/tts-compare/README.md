# Speech provider comparison

A research harness, not product code. It synthesises one corpus through every configured speech provider and builds a page for judging them side by side. Nothing here is imported by `apps/web` or `apps/site`, and deleting the directory has no effect on the product.

## Run it

```bash
pnpm tts:compare                              # every language, every configured provider
pnpm tts:compare --languages et,ja            # a subset
pnpm tts:compare --only azure,google-chirp    # a subset of providers
```

Open `scripts/tts-compare/out/index.html` afterwards.

Credentials are read from `apps/web/.dev.vars` first, then the environment. A provider without credentials is skipped rather than failing the run, so a partial comparison still works.

| Variable | Provider |
| --- | --- |
| `GOOGLE_CLOUD_TTS_CREDENTIALS` | Gemini-TTS and Chirp 3 HD, as the product uses them today |
| `OPENAI_API_KEY` | `gpt-4o-mini-tts`, the product's last fallback |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Azure AI Speech, the candidate |

Azure's key comes from a Speech resource in the Azure portal; the region is its short name, such as `westeurope`. The free tier covers 500,000 characters a month, which is far more than a full run of this corpus.

A whole run is six languages, about 80 items, four providers: under a dollar in total, and well inside Azure's and Chirp's free tiers.

## The corpus

Each language contributes plain learner vocabulary, three sentences, and a `contrasts` group. The contrasts are the point. Every language here writes at least one phonemic distinction ambiguously or not at all, which is exactly where a general multilingual model has nothing to go on:

- **Estonian** — the third (overlong) quantity and palatalisation are never written. `kapi` and `kappi` must differ audibly; if they do not, the model has no Estonian quantity.
- **Russian** — stress is phonemic and unmarked. `замок` is a castle or a lock depending on it.
- **Japanese** — pitch accent is phonemic and unmarked, and kanji readings are ambiguous in isolation. `箸` and `橋` must differ.
- **Ukrainian** — `ґ` against `г`, and `и` as [ɪ] rather than the Russian [i]. A model leaning on Russian training data collapses both.
- **Spanish** — `es-ES` should use distinción, so `cinco` is [θinko]. [sinko] means the locale is not being honoured.
- **English** — the control. `read` and `live` are ambiguous in isolation for English too.

Estonian contrast items link to Sõnaveeb, where the Institute of the Estonian Language publishes human audio for the most frequent headwords. That is the reference to judge against, not another synthesiser.

The Estonian palatalisation set is one item and should grow. The NoDaLiDa 2025 isolated-word paper from the Institute of the Estonian Language evaluated against 16 palatalisation pairs and 16 quantity pairs; borrowing that set would make this a real benchmark rather than a spot check.

## Judging

Turn on blind mode before listening. Clip labels become rotating letters that differ per item, so neither the provider name nor the column position tells you who made it. Rate everything, then reveal and export.

Ratings live in the browser's local storage and export as JSON. They are per browser and per machine — nothing is uploaded.

## What this harness deliberately does not do

Azure is implemented here, in `azure.mjs`, rather than in `apps/web/src/server/ai`. Promoting a provider into the product's chain is a decision this comparison exists to inform. The other three are imported from the product unchanged, prompts included, so the baseline is what a learner actually hears today and not a re-implementation of it.

`azure.mjs` accepts an optional IPA `phonemes` argument and wraps it in an SSML `<phoneme>` element. Nothing passes it yet. It is there because cards already carry a `pronunciation` field, and feeding a pronunciation beats inferring one for every language at once — worth testing separately once the vendor question is settled.
