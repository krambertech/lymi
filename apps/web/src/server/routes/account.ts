import {
  AccountDeletionInput,
  AccountDeletionOut,
  CLIENT_HEADER,
  DeletionCodeOut,
  OkOut,
  parseClientHeader,
} from "@lymi/core";
import { Hono } from "hono";
import { appleIdTokenVerifier } from "../apple-id-token";
import { appleKeyOf, revokeAppleGrant } from "../apple-revoke";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { erasePostHogPerson } from "../posthog";
import {
  type DeletionLeftovers,
  deleteAccount,
  deleteCardAudio,
  deleteExportFiles,
  deleteImportFiles,
  deletionSummary,
  sendDeletionCode,
  sendTransactionalEmail,
} from "../services";
import { track } from "../services/analytics";

/** Ending the learner's own account. Mounted at /api/me; the learner's session only. */
export const account = new Hono<AppEnv>();

const LEARNER_ONLY = "Session only. Any API key or token gets 403.";

account.get(
  "/deletion",
  describe({
    tags: ["Account"],
    summary: "What deleting the account takes",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Counts what goes, names the decks that stay for the people studying them, and says how the delete is confirmed.`,
    ok: { schema: AccountDeletionOut, description: "What a delete would take" },
  }),
  async (c) => c.json(await deletionSummary(ctxOf(c))),
);

account.post(
  "/deletion/code",
  describe({
    tags: ["Account"],
    summary: "Email a code to delete the account",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Sends a six-digit code to the account's email, good for 15 minutes; a new one replaces the last. 409 \`code_sent\` within a minute of the last code, \`code_limit\` after five codes in a day; 409 \`publisher\` for an account that publishes decks.`,
    ok: { schema: DeletionCodeOut, description: "Where the code went" },
    errors: [409, 503],
  }),
  async (c) => c.json(await sendDeletionCode(ctxOf(c), c.env, c.req.raw)),
);

account.delete(
  "/",
  describe({
    tags: ["Account"],
    summary: "Delete the account",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Final. Deletes the account and everything it holds, signs it out everywhere and emails the address that it happened. Decks other people study stay for them. Confirm with the emailed \`code\`, or with a fresh Sign in with Apple for an account that uses one. 400 \`code_wrong\` or \`code_expired\`; 403 \`apple_mismatch\`; 409 \`publisher\`.`,
    ok: { schema: OkOut, description: "Deleted" },
    errors: [400, 409],
  }),
  body(AccountDeletionInput, "confirmation"),
  async (c) => {
    const ctx = ctxOf(c);
    const auth = c.get("auth");
    const client = parseClientHeader(c.req.header(CLIENT_HEADER)) ? "phone" : "web";
    const bundle = c.env.APPLE_APP_BUNDLE_IDENTIFIER;
    const verify = bundle ? appleIdTokenVerifier(bundle) : null;
    const confirmation = c.req.valid("json");
    const endSessions = async (userId: string) => {
      const { internalAdapter } = await auth.$context;
      await internalAdapter.deleteUserSessions(userId);
    };
    const leftovers = await deleteAccount(ctx, confirmation, {
      client,
      request: c.req.raw,
      verifyApple: verify ? (token, nonce) => verify(token, nonce) : null,
      endSessions,
    });
    // PostHog's copy goes with the person, so the count lives in the Worker's own dataset.
    track(c.env.EVENTS, {
      name: "account_deleted",
      client,
      confirmed_with: leftovers.confirmedWith,
      kept_decks: leftovers.keptDecks,
    });
    c.executionCtx.waitUntil(
      clearLeftovers(c.env, ctx.userId, leftovers, {
        appleCode: "apple" in confirmation ? confirmation.apple.authorizationCode : undefined,
        send: (input) => sendTransactionalEmail(ctx, c.env, input),
        endSessions,
      }),
    );
    return c.json({ ok: true as const });
  },
);

/** Storage the database cannot cascade into, the services that keep a copy, and the goodbye. */
async function clearLeftovers(
  env: AppEnv["Bindings"],
  userId: string,
  leftovers: DeletionLeftovers,
  extra: {
    appleCode: string | undefined;
    send: (input: Parameters<typeof sendTransactionalEmail>[2]) => Promise<unknown>;
    endSessions: (userId: string) => Promise<void>;
  },
) {
  const appleKey = appleKeyOf(env);
  await Promise.allSettled([
    leftovers.sessionsEnded ? Promise.resolve() : extra.endSessions(userId),
    ...chunks(leftovers.privateImages, 1000).map((keys) => env.PRIVATE_IMAGES.delete(keys)),
    deleteCardAudio(env.AUDIO, leftovers.audioCards),
    ...leftovers.imports.map((row) => deleteImportFiles(env.IMPORTS, row)),
    ...leftovers.exports.map((row) => deleteExportFiles(env.EXPORTS, row)),
    erasePostHogPerson(env, userId),
    appleKey && extra.appleCode ? revokeAppleGrant(appleKey, extra.appleCode) : Promise.resolve(),
    extra.send({
      kind: "account-deleted",
      to: leftovers.email,
      language: leftovers.language,
    }),
  ]);
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
