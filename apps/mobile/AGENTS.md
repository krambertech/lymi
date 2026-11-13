# Phone app

Read [README.md](README.md) for setup, shared code, Lingui compilation and native behavior. Use [the verify-phone skill](../../.agents/skills/verify-phone/SKILL.md) for runtime proof in its own Simulator.

Use `formatList()` from `src/i18n/list.ts`; Hermes lacks `Intl.ListFormat`. Set `keyboardShouldPersistTaps` on every scroll view so taps reach controls while the keyboard is open. Use `FieldError` for error lines so its icon and text align across wrapped messages.

Record a `CACHE_SHAPE` decision when changing frozen responses; `pnpm check:cache-shape` enforces it. Files in `contract/` are releases' frozen APIs, written by `pnpm --filter @lymi/mobile contract:freeze`. Never edit one; delete it only when the minimum supported version passes it ([ADR 0032](../../docs/adr/0032-the-phone-ships-over-the-air-and-the-api-keeps-every-supported-release-working.md)).
