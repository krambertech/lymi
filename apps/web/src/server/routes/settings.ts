import { DeviceTimezoneInput, ReviewTimezoneInput, SettingsOut, SettingsPatch } from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { getSettings, reportDeviceTimezone, setReviewTimezone, updateSettings } from "../services";

export const settings = new Hono<AppEnv>();

settings.get(
  "/",
  describe({
    tags: ["Settings"],
    summary: "Get settings",
    description:
      "Created with defaults on first read. `appLanguage` is null until the learner chooses; `meaningLanguage` follows it and defaults to `en`.",
    ok: { schema: SettingsOut, description: "Settings" },
  }),
  async (c) => c.json(await getSettings(ctxOf(c))),
);

settings.patch(
  "/",
  describe({
    tags: ["Settings"],
    summary: "Change settings",
    description:
      "Sets the app language, which also sets the language meanings are written in. Needs the write scope. `dailyGoal` is learner-only: an API key or token that sends it gets 403.",
    ok: { schema: SettingsOut, description: "Settings after the change" },
    errors: [400],
  }),
  body(SettingsPatch, "settings"),
  async (c) => c.json(await updateSettings(ctxOf(c), c.req.valid("json"))),
);

settings.put(
  "/timezone/device",
  describe({
    tags: ["Settings"],
    summary: "Report the device zone",
    learnerOnly: true,
    description:
      "Learner only; send it from a visible page. While the review zone is automatic it follows this device, which moves where today begins without rewriting completed days. A manual zone ignores it.",
    ok: { schema: SettingsOut, description: "Settings after the report" },
    errors: [400],
  }),
  body(DeviceTimezoneInput, "timezone"),
  async (c) => c.json(await reportDeviceTimezone(ctxOf(c), c.req.valid("json"))),
);

settings.put(
  "/timezone",
  describe({
    tags: ["Settings"],
    summary: "Choose the review zone",
    learnerOnly: true,
    description:
      "Learner only. `manual` keeps the given zone until the learner goes back to `automatic`, which follows the foregrounded device again.",
    ok: { schema: SettingsOut, description: "Settings after the change" },
    errors: [400],
  }),
  body(ReviewTimezoneInput, "timezone"),
  async (c) => c.json(await setReviewTimezone(ctxOf(c), c.req.valid("json"))),
);
