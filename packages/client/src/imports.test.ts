import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { blobSource, splitNoteTypes, type UploadProgress, uploadInParts } from "./imports";

const file = blobSource(new Blob([new Uint8Array(25).map((_, i) => i)]));

describe("uploadInParts", () => {
  it("sends every part in order, each the right slice, and reports progress", async () => {
    const sent: [number, number[]][] = [];
    const progress: UploadProgress[] = [];
    await uploadInParts(
      file,
      10,
      async (part, body) => {
        sent.push([part, [...new Uint8Array(await (body as Blob).arrayBuffer())]]);
      },
      { signal: new AbortController().signal, onProgress: (p) => progress.push(p) },
    );
    expect(sent.map(([part, bytes]) => [part, bytes.length, bytes[0]])).toEqual([
      [1, 10, 0],
      [2, 10, 10],
      [3, 5, 20],
    ]);
    expect(progress.map((p) => p.sent)).toEqual([0, 10, 20, 25]);
  });

  it("retries a part that fails on the network, then carries on", async () => {
    vi.useFakeTimers();
    let failures = 1;
    const send = vi.fn(async () => {
      if (failures-- > 0) throw new ApiError(0, "offline");
    });
    const done = uploadInParts(file, 10, send, { signal: new AbortController().signal });
    await vi.runAllTimersAsync();
    await done;
    expect(send).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it("stops at once when the server refuses a part", async () => {
    const send = vi.fn(async () => {
      throw new ApiError(400, "Part 1 must be exactly 10 bytes.");
    });
    await expect(
      uploadInParts(file, 10, send, { signal: new AbortController().signal }),
    ).rejects.toThrow("exactly");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("resumes from a later part", async () => {
    const parts: number[] = [];
    await uploadInParts(file, 10, async (part) => void parts.push(part), {
      signal: new AbortController().signal,
      from: 3,
    });
    expect(parts).toEqual([3]);
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    const send = vi.fn(async () => {
      controller.abort(new Error("cancelled"));
      throw new ApiError(0, "aborted");
    });
    await expect(uploadInParts(file, 10, send, { signal: controller.signal })).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

const types = (...notes: number[]) => notes.map((n, i) => ({ key: `t${i}`, notes: n }));

describe("splitNoteTypes", () => {
  it("asks about the biggest kinds and folds the rare tail", () => {
    const { asked, rest } = splitNoteTypes(types(3, 1800, 5, 150, 2, 40));
    expect(asked.map((t) => t.notes)).toEqual([1800, 150]);
    expect(rest.map((t) => t.notes)).toEqual([40, 5, 3, 2]);
  });

  it("asks about every kind when the tail would be a single one", () => {
    const { asked, rest } = splitNoteTypes(types(6, 1, 1, 1));
    expect(asked.map((t) => t.notes)).toEqual([6, 1, 1, 1]);
    expect(rest).toEqual([]);
    expect(splitNoteTypes(types(990, 10)).asked).toHaveLength(2);
  });

  it("always asks about at least one kind", () => {
    expect(splitNoteTypes(types(500)).asked).toHaveLength(1);
  });
});
