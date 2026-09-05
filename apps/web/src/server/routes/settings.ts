import { SettingsOut, SettingsPatch } from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { getSettings, updateSettings } from "../services";

export const settings = new Hono<AppEnv>();

settings.get(
  "/",
  describe({
    tags: ["Settings"],
    summary: "Get settings",
    description: "Created with defaults on first read. `meaningLanguage` defaults to `en`.",
    ok: { schema: SettingsOut, description: "Settings" },
  }),
  async (c) => c.json(await getSettings(ctxOf(c))),
);

settings.patch(
  "/",
  describe({
    tags: ["Settings"],
    summary: "Change settings",
    description: "Needs the write scope.",
    ok: { schema: SettingsOut, description: "Settings after the change" },
    errors: [400, 403],
  }),
  body(SettingsPatch, "settings"),
  async (c) => c.json(await updateSettings(ctxOf(c), c.req.valid("json"))),
);
