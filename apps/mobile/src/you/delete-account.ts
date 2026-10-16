import { msg } from "@lingui/core/macro";
import { api, refusalCode } from "@lymi/client/api";
import { dropQueued } from "@lymi/client/queued";
import type { AccountDeletionInput } from "@lymi/core";
import * as AppleAuthentication from "expo-apple-authentication";
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from "expo-crypto";
import { authClient } from "../auth/client";

/** The server's refusals, by its `code`, in the app's words. */
export const REFUSALS = {
  code_sent: msg`A code is already on its way. Wait a minute before asking for another.`,
  code_limit: msg`You’ve asked for several codes today. Try again tomorrow.`,
  code_wrong: msg`That code isn’t right. Check the email and try again.`,
  code_expired: msg`This code has expired. Send a new one.`,
  apple_mismatch: msg`Sign in with the Apple ID this account uses.`,
  publisher: msg`This account publishes decks, so it can’t be deleted in the app.`,
} as const;

export type Refusal = keyof typeof REFUSALS;

/** Which refusal a failed request was, or null for anything else, such as no connection. */
export function refusalOf(error: unknown): Refusal | null {
  const code = refusalCode(error);
  return code && code in REFUSALS ? (code as Refusal) : null;
}

/**
 * A fresh Sign in with Apple to confirm the delete, with a nonce so the token cannot be replayed.
 * Null when the learner closes Apple's sheet.
 */
export async function confirmWithApple(): Promise<AccountDeletionInput | null> {
  const nonce = randomUUID();
  const hashed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({ nonce: hashed });
    if (!credential.identityToken) return null;
    return {
      apple: {
        idToken: credential.identityToken,
        nonce,
        authorizationCode: credential.authorizationCode ?? undefined,
      },
    };
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw error;
  }
}

/**
 * Deletes the account, then forgets it on this phone. The root clears the cache, the widgets and
 * the reminders, and resets analytics, once the session is gone; nothing queued can send any more.
 */
export async function deleteAccount(confirmation: AccountDeletionInput): Promise<void> {
  await api.deleteAccount(confirmation);
  dropQueued();
  await authClient.signOut().catch(() => undefined);
}
