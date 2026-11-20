import { describe, expect, it } from "vitest";
import { finishSection, readProgress, startLesson } from "./progress";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("lesson progress", () => {
  it("starts a lesson once and finishes it with its last section", () => {
    const store = memoryStorage();
    startLesson("numbrid", store);
    expect(readProgress(store).lessons.numbrid).toEqual({ state: "started" });
    expect(finishSection("numbrid", "ten", ["ten", "build"], store)).toEqual({
      lessonFinished: false,
    });
    expect(finishSection("numbrid", "ten", ["ten", "build"], store)).toEqual({
      lessonFinished: false,
    });
    expect(finishSection("numbrid", "build", ["ten", "build"], store)).toEqual({
      lessonFinished: true,
    });
    expect(readProgress(store).lessons.numbrid).toEqual({ state: "done" });
    startLesson("numbrid", store);
    expect(readProgress(store).lessons.numbrid).toEqual({ state: "done" });
  });

  it("keeps only well-formed progress from storage", () => {
    const store = memoryStorage();
    store.setItem(
      "lymi-estonian-lessons",
      JSON.stringify({
        v: 1,
        lessons: { haaldus: { state: "done" }, numbrid: { state: "finished" }, x: "done" },
        sections: { haaldus: ["pairs", 3, "spell"], numbrid: "ten" },
      }),
    );
    expect(readProgress(store)).toEqual({
      lessons: { haaldus: { state: "done" } },
      sections: { haaldus: ["pairs", "spell"] },
    });
    expect(() => finishSection("numbrid", "ten", ["ten"], store)).not.toThrow();
  });

  it("reads progress in another format as none", () => {
    const store = memoryStorage();
    store.setItem(
      "lymi-estonian-lessons",
      JSON.stringify({ lessons: { haaldus: { state: "done" } } }),
    );
    expect(readProgress(store)).toEqual({ lessons: {}, sections: {} });
  });

  it("reads broken storage as no progress", () => {
    const store = memoryStorage();
    store.setItem("lymi-estonian-lessons", "{not json");
    expect(readProgress(store)).toEqual({ lessons: {}, sections: {} });
  });
});
