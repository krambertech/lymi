import type { StoredGrade } from "@lymi/client/grades";
import type { DrawData } from "@lymi/client/review-draw";
import { describe, expect, it } from "vitest";
import { withoutDropped } from "./dropped";

const at = "2026-10-14T08:00:00.000Z";
const sentAt = Date.parse(at) + 1_000;
const grade = {
  cardId: "a",
  mode: { cue: "term", target: "meaning" },
  rating: 3,
  reviewedAt: at,
  sentAt,
} as StoredGrade;
const draw = (log: { cardId: string; at: string }[]) => ({ log }) as unknown as DrawData;

describe("withoutDropped", () => {
  it("keeps a sent grade the server's draw still holds", () => {
    expect(withoutDropped([grade], draw([{ cardId: "a", at }]), sentAt + 120_000)).toEqual([grade]);
  });

  it("drops a sent grade a draw read well after the send no longer holds", () => {
    expect(withoutDropped([grade], draw([]), sentAt + 120_000)).toEqual([]);
  });

  it("keeps a sent grade a draw read too soon after the send may have missed", () => {
    expect(withoutDropped([grade], draw([]), sentAt + 5_000)).toEqual([grade]);
  });

  it("keeps queued grades and undos, which have not reached the server", () => {
    const queued = { ...grade, sentAt: undefined };
    const undone = { ...grade, undone: true };
    expect(withoutDropped([queued, undone], draw([]), sentAt + 120_000)).toEqual([queued, undone]);
  });
});
