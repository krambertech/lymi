# Web product and backend

## Client

Files under `src/client` use kebab-case, except TanStack Router's route filenames. Web callers import API methods and queries from `@/lib/api` and `@/lib/queries`, which re-export the shared client package.

The service worker precaches only the shell; API responses go through TanStack Query so offline reviews have one data path.

Call `useReduceMotion()` for web motion so it honors both the learner's setting and the `/design` switch. Direct imports of `useReducedMotion` or `useReducedMotionConfig` from `motion/react` bypass that contract.

## Server

Routes in `src/server/routes` parse, describe for OpenAPI and return. Services in `src/server/services` hold logic and own database access; routes must not reach into Drizzle. Every write goes through `src/server/services/audit.ts`, taking actor and connected app from service context so integration activity stays visible.
