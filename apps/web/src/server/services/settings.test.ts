import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import type { ServiceContext } from "./context";
import { ensureSettings, getSettings, updateSettings } from "./settings";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
let kateryna: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  kateryna = await learner(db, "kateryna", "Kateryna");
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("daily goal", () => {
  it("starts at 50 and changes when the learner sets it", async () => {
    expect((await getSettings(kateryna)).dailyGoal).toBe(50);
    expect((await updateSettings(kateryna, { dailyGoal: 50 })).dailyGoal).toBe(50);
  });

  it("refuses an integration, whatever its scope", async () => {
    for (const actor of ["api", "mcp"] as const) {
      await expect(updateSettings({ ...kateryna, actor }, { dailyGoal: 10 })).rejects.toMatchObject(
        {
          code: "forbidden",
        },
      );
    }
    expect((await getSettings(kateryna)).dailyGoal).toBe(50);
  });

  it("still lets an integration change the app language", async () => {
    const updated = await updateSettings({ ...kateryna, actor: "mcp" }, { appLanguage: "uk" });

    expect(updated).toMatchObject({ appLanguage: "uk", dailyGoal: 50 });
  });
});

describe("reading settings", () => {
  it("writes nothing, and the defaults it returns match a stored row", async () => {
    const reader = await learner(db, "reader", "Reader");
    const rows = () =>
      db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, "reader"));

    const read = await getSettings({ ...reader, actor: "mcp" });
    expect(await rows()).toEqual([]);

    await ensureSettings(reader);
    const [stored] = await rows();
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...defaults } = read;
    expect(stored).toMatchObject(defaults);
  });
});
