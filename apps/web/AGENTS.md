# Web product and backend

## Client

Files under `src/client` use kebab-case, except TanStack Router's route filenames. Web callers import API methods and queries from `@/lib/api` and `@/lib/queries`, which re-export the shared client package.

The service worker precaches only the shell; API responses go through TanStack Query so offline reviews have one data path.

Call `useReduceMotion()` for web motion so it honors both the learner's setting and the `/design` switch. Direct imports of `useReducedMotion` or `useReducedMotionConfig` from `motion/react` bypass that contract.

## Server

Routes in `src/server/routes` parse, describe for OpenAPI and return. Services in `src/server/services` hold logic and own database access; routes must not reach into Drizzle. Every write goes through `src/server/services/audit.ts`, taking actor and connected app from service context so integration activity stays visible.

A catch uses its error: it rethrows it, narrows to the one it expects and rethrows the rest, passes it on as a `cause`, or reports it. Text that may not parse goes through `src/server/parse.ts`. `src/server/log.ts` is the only server code of ours that writes to the console: an event from its list, with ids, counts, fixed words and an `error` it reduces to a class and code. Its types refuse text and its field shapes redact what they miss, with three gaps a reviewer still checks: `slug` and `language` take any value of their shape, a word field holds one word that a cast or an `any` object carried past the types, and Better Auth prints the raw error of a failed join itself, with its SQL and the ids bound to it. `lymi/no-swallowed-failure` and the restricted `console` global hold both. A log line alerts nobody; a failure someone must act on goes to `reportServerException`, or fails its cron job or Workflow step.
