import {
  OkOut,
  PushConfigOut,
  PushEndpointInput,
  PushSubscriptionInput,
  PushSubscriptionStatusOut,
} from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { pushSubscriptionStatus, removePushSubscription, savePushSubscription } from "../services";
import { ServiceError } from "../services/context";

export const push = new Hono<AppEnv>();

push.get(
  "/config",
  describe({
    tags: ["Reminders"],
    summary: "Get the public Web Push configuration",
    learnerOnly: true,
    ok: { schema: PushConfigOut, description: "Public VAPID key for this app" },
    errors: [503],
  }),
  (c) => {
    if (!c.env.VAPID_PUBLIC_KEY || !c.env.VAPID_PRIVATE_KEY || !c.env.VAPID_SUBJECT) {
      throw new ServiceError("unavailable", "Reminders are not configured yet");
    }
    return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY });
  },
);

push.post(
  "/status",
  describe({
    tags: ["Reminders"],
    summary: "Check this device's reminder",
    learnerOnly: true,
    ok: { schema: PushSubscriptionStatusOut, description: "Reminder state for this device" },
    errors: [400],
  }),
  body(PushEndpointInput, "push endpoint"),
  async (c) => c.json(await pushSubscriptionStatus(ctxOf(c), c.req.valid("json"))),
);

push.put(
  "/subscription",
  describe({
    tags: ["Reminders"],
    summary: "Enable or update this device's reminder",
    learnerOnly: true,
    ok: { schema: PushSubscriptionStatusOut, description: "Saved reminder state" },
    errors: [400],
  }),
  body(PushSubscriptionInput, "push subscription"),
  async (c) => c.json(await savePushSubscription(ctxOf(c), c.req.valid("json"))),
);

push.delete(
  "/subscription",
  describe({
    tags: ["Reminders"],
    summary: "Turn off this device's reminder",
    learnerOnly: true,
    ok: { schema: OkOut, description: "Reminder removed" },
    errors: [400],
  }),
  body(PushEndpointInput, "push endpoint"),
  async (c) => c.json(await removePushSubscription(ctxOf(c), c.req.valid("json"))),
);
