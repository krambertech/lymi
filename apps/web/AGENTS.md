# Web product and backend

## Client

Files under `src/client` use kebab-case, except TanStack Router's route filenames. Web callers import API methods and queries from `@/lib/api` and `@/lib/queries`, which re-export the shared client package.

The service worker precaches only the shell; API responses go through TanStack Query so offline reviews have one data path.

Call `useReduceMotion()` for web motion so it honors both the learner's setting and the `/design` switch. Direct imports of `useReducedMotion` or `useReducedMotionConfig` from `motion/react` bypass that contract.

A page's keyboard shortcut goes through `useShortcut` in `src/client/lib/use-shortcut.ts`, which ignores the key under an open overlay, in a field, on repeat, with a modifier and while an input method composes; an exception is a named option there. `lymi/shortcut-owner` rejects a `keydown` listener on the window or document, and `lymi/enter-composing` an Enter handler without `composing(e)`.

## Server

Routes in `src/server/routes` parse, describe for OpenAPI and return. Services in `src/server/services` hold logic and own database access; routes must not reach into Drizzle. Every write goes through `src/server/services/audit.ts`, taking actor and connected app from service context so integration activity stays visible.

An AI request carries an `AiConsent`, which only a check in `src/server/services/ai-consent.ts` returns ([ADR 0039](../../docs/adr/0039-the-phone-sends-nothing-to-ai-until-the-learner-allows-it.md)). Ask for it in the service, next to the content it sends, and again before each request of a longer run. `consentForCanary` and `consentForEvaluation` in `src/server/ai/consent.ts` are the only exemptions, for text Lymi wrote itself; `lymi/ai-consent` rejects them, and any cast to `AiConsent`, outside the canary and the evaluation scripts.
