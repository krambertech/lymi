import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, type Import } from "./api";
import {
  blobSource,
  resumeUpload,
  retryUpload,
  splitNoteTypes,
  startUpload,
  stopUpload,
  type UploadProgress,
  type UploadState,
  uploadInParts,
  uploadReducer,
  uploadState,
} from "./imports";
import { importQuery } from "./queries";

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

describe("uploadReducer", () => {
  const sending: UploadState = { status: "sending", sent: 10, total: 25 };
  const joining: UploadState = { status: "joining", sent: 25, total: 25 };
  const failed: UploadState = { status: "failed", sent: 10, total: 25, error: "offline" };

  it("walks from sending to joining, and from a failure back to sending", () => {
    expect(uploadReducer(sending, { type: "progressed", sent: 20 })).toEqual({
      status: "sending",
      sent: 20,
      total: 25,
    });
    expect(uploadReducer(sending, { type: "sentAll" })).toEqual(joining);
    expect(uploadReducer(sending, { type: "failed", error: "offline" })).toEqual(failed);
    expect(uploadReducer(joining, { type: "failed", error: "offline" })).toEqual({
      ...failed,
      sent: 25,
    });
    expect(uploadReducer(failed, { type: "retried" })).toEqual(sending);
  });

  it("changes nothing on an event its state does not allow", () => {
    expect(uploadReducer(sending, { type: "retried" })).toBe(sending);
    expect(uploadReducer(joining, { type: "retried" })).toBe(joining);
    expect(uploadReducer(joining, { type: "progressed", sent: 5 })).toBe(joining);
    expect(uploadReducer(failed, { type: "progressed", sent: 20 })).toBe(failed);
    expect(uploadReducer(failed, { type: "sentAll" })).toBe(failed);
  });
});

describe("the upload store", () => {
  const item = (received = 0) =>
    ({ id: "i1", upload: { partBytes: 10, parts: 3, received } }) as Import;
  const done = { ...item(3), status: "inspecting" } as Import;
  function held() {
    const calls: { part: number; resolve: () => void; reject: (err: unknown) => void }[] = [];
    vi.spyOn(api, "uploadImportPart").mockImplementation(
      (_id, part) =>
        new Promise<never>((resolve, reject) => {
          calls.push({ part, resolve: () => resolve(undefined as never), reject });
        }),
    );
    return calls;
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  afterEach(() => {
    stopUpload("i1");
    vi.restoreAllMocks();
  });

  it("sends, joins and then forgets the upload", async () => {
    const qc = new QueryClient();
    vi.spyOn(api, "startImport").mockResolvedValue(item());
    vi.spyOn(api, "uploadImportPart").mockResolvedValue(undefined as never);
    const complete = vi.spyOn(api, "completeImport").mockResolvedValue(done);
    await startUpload(file, qc);
    expect(uploadState("i1")).toEqual({ status: "sending", sent: 0, total: 25 });
    await settle();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(uploadState("i1")).toBeNull();
    expect(qc.getQueryData(importQuery("i1").queryKey)).toEqual(done);
  });

  it("leaves an upload that is still going alone when asked to retry", async () => {
    const qc = new QueryClient();
    vi.spyOn(api, "startImport").mockResolvedValue(item());
    const calls = held();
    await startUpload(file, qc);
    await settle();
    retryUpload("i1", qc);
    await settle();
    expect(calls.map((call) => call.part)).toEqual([1]);
  });

  it("retries a failed upload from the part that failed", async () => {
    const qc = new QueryClient();
    vi.spyOn(api, "startImport").mockResolvedValue(item());
    const calls = held();
    await startUpload(file, qc);
    await settle();
    calls[0]?.resolve();
    await settle();
    calls[1]?.reject(new ApiError(400, "refused"));
    await settle();
    expect(uploadState("i1")).toEqual({ status: "failed", sent: 10, total: 25, error: "refused" });
    retryUpload("i1", qc);
    await settle();
    expect(uploadState("i1")).toEqual({ status: "sending", sent: 10, total: 25 });
    expect(calls.map((call) => call.part)).toEqual([1, 2, 2]);
  });

  it("stops the run it replaces, so no part is sent twice", async () => {
    const qc = new QueryClient();
    qc.setQueryData(importQuery("i1").queryKey, item());
    const signals: (AbortSignal | undefined)[] = [];
    vi.spyOn(api, "uploadImportPart").mockImplementation((_id, _part, _body, signal) => {
      signals.push(signal);
      return new Promise<never>(() => {});
    });
    resumeUpload(item(), file, qc);
    await settle();
    resumeUpload(item(), file, qc);
    await settle();
    expect(signals.map((signal) => signal?.aborted)).toEqual([true, false]);
  });

  it("keeps the new upload when the one it replaced finishes joining", async () => {
    const qc = new QueryClient();
    vi.spyOn(api, "startImport").mockResolvedValue(item());
    vi.spyOn(api, "uploadImportPart").mockResolvedValue(undefined as never);
    let join: (joined: Import) => void = () => undefined;
    vi.spyOn(api, "completeImport").mockImplementation(
      () => new Promise<Import>((resolve) => (join = resolve)),
    );
    await startUpload(file, qc);
    await settle();
    expect(uploadState("i1")?.status).toBe("joining");
    const calls = held();
    resumeUpload(item(1), file, qc);
    join(done);
    await settle();
    expect(uploadState("i1")).toEqual({ status: "sending", sent: 10, total: 25 });
    expect(calls.map((call) => call.part)).toEqual([2]);
    expect(qc.getQueryData<Import>(importQuery("i1").queryKey)?.status).not.toBe("inspecting");
  });
});
