import { SettingsPatch } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, parseBody } from "../http";
import type { AppEnv } from "../index";
import { getSettings, updateSettings } from "../services";

export const settings = new Hono<AppEnv>();

settings.get("/", async (c) => c.json(await getSettings(ctxOf(c))));
settings.patch("/", async (c) =>
  c.json(await updateSettings(ctxOf(c), await parseBody(c, SettingsPatch, "settings"))),
);
