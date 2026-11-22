import type { StreakOut } from "@lymi/core";
import { MutationObserver, type MutationObserverOptions, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, type Settings } from "./api";
import { settingsQuery, streakQuery } from "./queries";

const held = vi.hoisted(() => ({ qc: undefined as unknown, status: undefined as unknown }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useRef: (current: unknown) => ({ current }),
  useState: () => [
    undefined,
    (next: unknown) => {
      held.status = next;
    },
  ],
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => held.qc,
  useMutation: (options: MutationObserverOptions) => ({
    mutate: (variables: unknown) =>
      void new MutationObserver(held.qc as QueryClient, options)
        .mutate(variables as never)
        .catch(() => {}),
  }),
}));

const { useDailyGoal } = await import("./daily-goal");

const streak = (outcome: string) =>
  ({ goal: 10, today: { outcome, goal: 10 } }) as unknown as StreakOut;
const settle = () => new Promise((resolve) => setTimeout(resolve));

let qc: QueryClient;
let sent: { goal: number; land: () => void; fail: () => void }[];
const goals = () => [
  qc.getQueryData<StreakOut>(streakQuery.queryKey)?.goal,
  qc.getQueryData<Settings>(settingsQuery.queryKey)?.dailyGoal,
];

beforeEach(() => {
  qc = new QueryClient();
  held.qc = qc;
  sent = [];
  qc.setQueryData(streakQuery.queryKey, streak("open"));
  qc.setQueryData(settingsQuery.queryKey, { dailyGoal: 10 } as Settings);
  vi.spyOn(api, "updateSettings").mockImplementation(
    ({ dailyGoal }) =>
      new Promise((resolve, reject) => {
        sent.push({
          goal: dailyGoal ?? 0,
          land: () => resolve({ dailyGoal } as Settings),
          fail: () => reject(new Error("offline")),
        });
      }),
  );
});

describe("changing the daily goal", () => {
  it("sends one choice at a time, in order, so the last chosen is the last written", async () => {
    const { change } = useDailyGoal();
    change(25);
    change(50);
    await settle();
    expect(sent.map((write) => write.goal)).toEqual([25]);
    expect(goals()).toEqual([50, 50]);
    sent[0]?.land();
    await settle();
    expect(sent.map((write) => write.goal)).toEqual([25, 50]);
    expect(goals()).toEqual([50, 50]);
    sent[1]?.land();
    await settle();
    expect(goals()).toEqual([50, 50]);
    expect(held.status).toBe("saved");
  });

  it("goes back to where the first choice began when the last fails, and asks the server", async () => {
    const { change } = useDailyGoal();
    change(25);
    await settle();
    change(50);
    await settle();
    sent[0]?.land();
    await settle();
    sent[1]?.fail();
    await settle();
    expect(goals()).toEqual([10, 10]);
    expect(held.status).toBe("error");
    expect(qc.getQueryState(settingsQuery.queryKey)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(streakQuery.queryKey)?.isInvalidated).toBe(true);
  });

  it.each([
    ["an open day takes the new goal", "open", 25],
    ["a finished day keeps the goal it was finished against", "goal_met", 10],
  ])("%s", async (_, outcome, today) => {
    qc.setQueryData(streakQuery.queryKey, streak(outcome));
    useDailyGoal().change(25);
    await settle();
    expect(qc.getQueryData<StreakOut>(streakQuery.queryKey)?.today.goal).toBe(today);
    sent[0]?.land();
    await settle();
  });
});
