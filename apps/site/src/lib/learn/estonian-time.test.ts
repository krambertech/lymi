import { describe, expect, it } from "vitest";
import { ALL_TIMES, timeDigits, timeMatches, timeSentence, timeWords } from "./estonian-time";

describe("Estonian times", () => {
  it("says full hours with the hour that has struck", () => {
    expect(timeSentence({ hour: 3, minute: 0 })).toBe("Kell on kolm.");
    expect(timeWords({ hour: 12, minute: 0 })).toBe("kaksteist");
  });

  it("names halves and quarters after the hour that is coming", () => {
    expect(timeWords({ hour: 3, minute: 30 })).toBe("pool neli");
    expect(timeWords({ hour: 3, minute: 15 })).toBe("veerand neli");
    expect(timeWords({ hour: 3, minute: 45 })).toBe("kolmveerand neli");
    expect(timeWords({ hour: 12, minute: 30 })).toBe("pool üks");
    expect(timeWords({ hour: 11, minute: 45 })).toBe("kolmveerand kaksteist");
  });

  it("counts minutes past the hour that has struck, and minutes to the one that is coming", () => {
    expect(timeWords({ hour: 3, minute: 10 })).toBe("kümme minutit kolm läbi");
    expect(timeWords({ hour: 3, minute: 20 })).toBe("kakskümmend minutit kolm läbi");
    expect(timeWords({ hour: 3, minute: 50 })).toBe("kümne minuti pärast neli");
    expect(timeWords({ hour: 3, minute: 40 })).toBe("kahekümne minuti pärast neli");
    expect(timeWords({ hour: 12, minute: 55 })).toBe("viie minuti pärast üks");
  });

  it("has words for every time it offers", () => {
    expect(ALL_TIMES).toHaveLength(120);
    for (const time of ALL_TIMES) expect(timeWords(time)).not.toMatch(/undefined/);
    expect(timeDigits({ hour: 3, minute: 5 })).toBe("3:05");
  });

  it("accepts a time typed the usual ways", () => {
    const halfFour = { hour: 3, minute: 30 } as const;
    for (const typed of ["3:30", "3.30", "3,30", "330", "03:30", "15:30", " 3 : 30 "])
      expect(timeMatches(typed, halfFour), typed).toBe(true);
    for (const typed of ["4:30", "3:03", "3.3", "3", "half three", ""])
      expect(timeMatches(typed, halfFour), typed).toBe(false);
    expect(timeMatches("3", { hour: 3, minute: 0 })).toBe(true);
    expect(timeMatches("12:00", { hour: 12, minute: 0 })).toBe(true);
    expect(timeMatches("0:30", { hour: 12, minute: 30 })).toBe(true);
  });
});
