import { AnkiConnectCall } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { principalForKey } from "../principal";
import {
  answerCall,
  answerOpenCall,
  isOpenCall,
  PROTOCOL_VERSION,
  reply,
} from "../services/anki-connect";
import { enrichmentQueue } from "../services/enrichment";

/**
 * Where Yomitan and other AnkiConnect clients add cards. They send the Lymi key in the body and
 * call from their own extension origin without cookies, so this door authenticates itself and any
 * origin may ask. A refusal is a 200 with the protocol's error, which the client shows as it is.
 */
export const ankiConnect = new Hono<AppEnv>();

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

const NO_KEY =
  "Lymi didn’t accept this key. In Lymi’s Settings, make a key for Yomitan and paste it into Yomitan.";

ankiConnect.options("/", describe({ hide: true, open: true }), (c) => c.body(null, 204, CORS));

// Clients check the address with a plain GET before they post.
ankiConnect.get("/", describe({ hide: true, open: true }), (c) =>
  c.text(`AnkiConnect v.${PROTOCOL_VERSION}`, 200, CORS),
);

ankiConnect.post("/", describe({ hide: true, open: true }), async (c) => {
  const parsed = AnkiConnectCall.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(reply(undefined, null, "Lymi couldn’t read this request."), 200, CORS);
  }
  const call = parsed.data;
  if (isOpenCall(call)) return c.json(answerOpenCall(call), 200, CORS);

  const principal = call.key ? await principalForKey(c, call.key) : null;
  if (!principal || "error" in principal) {
    const error =
      principal?.status === 429 ? "Too many requests to Lymi. Try again in a minute." : NO_KEY;
    return c.json(reply(call.version, null, error), 200, CORS);
  }
  c.set("user", principal.user);
  c.set("actor", principal.actor);
  c.set("scope", principal.scope);
  c.set("client", principal.client);
  c.set("clientName", principal.clientName);
  const answer = await answerCall(ctxOf(c), call, {
    scope: principal.scope,
    enrichment: enrichmentQueue(c.env),
    media: c.env.IMPORTS && c.env.AUDIO ? { stash: c.env.IMPORTS, audio: c.env.AUDIO } : null,
  });
  return c.json(answer, 200, CORS);
});
