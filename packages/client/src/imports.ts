import type { ImportSource } from "@lymi/core";
import type { QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { ApiError, api, errorMessage, type Import } from "./api";
import { importQuery } from "./queries";

/** The apps an import comes from, by the names they go by everywhere. */
export const SOURCE_NAMES: Record<ImportSource, string> = {
  anki: "Anki",
  mochi: "Mochi",
  noji: "Noji",
  lymi: "Lymi",
  quizlet: "Quizlet",
};

/** The file names each app's import page accepts, checked before anything is sent. */
export const SOURCE_FILES: Record<ImportSource, RegExp> = {
  anki: /\.(apkg|colpkg)$/i,
  mochi: /\.mochi$/i,
  noji: /\.ofc$/i,
  lymi: /\.zip$/i,
  quizlet: /\.(txt|tsv|csv)$/i,
};

/** Each app's guide on the public site; Quizlet has none yet. */
export function importGuidePath(source: ImportSource): string | undefined {
  if (source === "lymi") return "/docs/export";
  if (source === "quizlet") return undefined;
  if (source === "noji") return "/docs/import-from-noji";
  return source === "mochi" ? "/docs/import-from-mochi" : "/docs/import-from-anki";
}

/** Note types that together hold this share of the notes are asked about one by one. */
const ASKED_SHARE = 0.95;

/**
 * Splits a file's note types into the ones the learner checks card by card and a tail of rare
 * ones, biggest first. A collection with fifteen note types, most holding a handful of notes,
 * should not ask fifteen questions. A tail of one is not worth folding away.
 */
export function splitNoteTypes<T extends { notes: number }>(types: readonly T[]) {
  const ordered = [...types].sort((a, b) => b.notes - a.notes);
  const total = ordered.reduce((sum, type) => sum + type.notes, 0);
  let covered = 0;
  let cut = 0;
  while (cut < ordered.length && (cut === 0 || covered < total * ASKED_SHARE)) {
    covered += ordered[cut]?.notes ?? 0;
    cut++;
  }
  if (ordered.length - cut < 2) return { asked: ordered, rest: [] as T[] };
  return { asked: ordered.slice(0, cut), rest: ordered.slice(cut) };
}

/** One part's bytes: a browser's Blob slice, or the bytes a phone read from its file. */
export type UploadBody = Blob | Uint8Array<ArrayBuffer>;

/** A file to send in parts, read a part at a time so a large file never sits in memory whole. */
export type UploadSource = {
  name: string;
  size: number;
  part: (start: number, end: number) => UploadBody | Promise<UploadBody>;
};

/** A browser file, or any Blob, as an upload source. */
export function blobSource(file: Blob & { name?: string }): UploadSource {
  return {
    name: file.name ?? "file",
    size: file.size,
    part: (start, end) => file.slice(start, end),
  };
}

const bodySize = (body: UploadBody) => (body instanceof Uint8Array ? body.byteLength : body.size);

export type UploadProgress = { sent: number; total: number };

export type SendPart = (part: number, body: UploadBody, signal: AbortSignal) => Promise<unknown>;

const ATTEMPTS = 4;

/** Waits before a retry, a little longer each time, or rejects at once when aborted. */
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * Sends a file in parts, one at a time, so a phone on a weak connection retries one part rather
 * than the whole file. A part that fails for a network or server reason is sent again; a part
 * the server refuses outright stops the upload.
 */
export async function uploadInParts(
  file: Pick<UploadSource, "size" | "part">,
  partBytes: number,
  send: SendPart,
  {
    signal,
    onProgress,
    from = 1,
  }: {
    signal: AbortSignal;
    onProgress?: (progress: UploadProgress) => void;
    /** The first part to send, when earlier parts already arrived. */
    from?: number;
  },
) {
  const parts = Math.max(1, Math.ceil(file.size / partBytes));
  let sent = Math.min(file.size, (from - 1) * partBytes);
  onProgress?.({ sent, total: file.size });
  for (let part = from; part <= parts; part++) {
    const body = await file.part((part - 1) * partBytes, Math.min(part * partBytes, file.size));
    for (let attempt = 1; ; attempt++) {
      try {
        await send(part, body, signal);
        break;
      } catch (err) {
        if (signal.aborted) throw err;
        const retryable = !(err instanceof ApiError) || err.status === 0 || err.status >= 500;
        if (!retryable || attempt >= ATTEMPTS) throw err;
        await pause(1000 * 2 ** (attempt - 1), signal);
      }
    }
    sent += bodySize(body);
    onProgress?.({ sent, total: file.size });
  }
}

/** An upload in this app. It outlives the import screen, so moving around the app does not stop it. */
export type UploadState = {
  sent: number;
  total: number;
  status: "sending" | "joining" | "failed";
  error?: string | undefined;
};

type Entry = { state: UploadState; file: UploadSource; controller: AbortController };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function set(id: string, state: UploadState) {
  const entry = entries.get(id);
  if (!entry) return;
  entry.state = state;
  emit();
}

async function run(id: string, qc: QueryClient, from: number) {
  const entry = entries.get(id);
  if (!entry) return;
  const { file, controller } = entry;
  const key = importQuery(id).queryKey;
  try {
    const current = qc.getQueryData<Import>(key) ?? (await api.import(id));
    await uploadInParts(
      file,
      current.upload.partBytes,
      (part, body, signal) => api.uploadImportPart(id, part, body, signal),
      {
        signal: controller.signal,
        from,
        onProgress: ({ sent, total }) => set(id, { sent, total, status: "sending" }),
      },
    );
    set(id, { sent: file.size, total: file.size, status: "joining" });
    qc.setQueryData(key, await api.completeImport(id));
    entries.delete(id);
    emit();
  } catch (err) {
    if (controller.signal.aborted) return;
    set(id, {
      sent: entry.state.sent,
      total: file.size,
      status: "failed",
      error: errorMessage(err),
    });
  }
}

/** Creates the import and starts sending the file. Resolves once the import exists. */
export async function startUpload(file: UploadSource, qc: QueryClient): Promise<Import> {
  const created = await api.startImport(file);
  qc.setQueryData(importQuery(created.id).queryKey, created);
  entries.set(created.id, {
    file,
    controller: new AbortController(),
    state: { sent: 0, total: file.size, status: "sending" },
  });
  emit();
  void run(created.id, qc, 1);
  return created;
}

/**
 * Picks an upload back up with the same file, from the first part the server has not seen.
 * Parts go one at a time, so the parts that arrived are always the first ones.
 */
export function resumeUpload(item: Import, file: UploadSource, qc: QueryClient) {
  entries.get(item.id)?.controller.abort();
  entries.set(item.id, {
    file,
    controller: new AbortController(),
    state: { sent: 0, total: file.size, status: "sending" },
  });
  emit();
  void run(item.id, qc, item.upload.received + 1);
}

export function retryUpload(id: string, qc: QueryClient) {
  const entry = entries.get(id);
  if (!entry) return;
  const from =
    Math.floor(
      entry.state.sent / (qc.getQueryData<Import>(importQuery(id).queryKey)?.upload.partBytes ?? 1),
    ) + 1;
  entry.controller = new AbortController();
  set(id, { ...entry.state, status: "sending", error: undefined });
  void run(id, qc, from);
}

export function stopUpload(id: string) {
  entries.get(id)?.controller.abort();
  entries.delete(id);
  emit();
}

/** Whether an upload in this app is still going, for a warning before leaving. */
export function uploading() {
  return [...entries.values()].some((entry) => entry.state.status !== "failed");
}

export function useUpload(id: string): UploadState | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => entries.get(id)?.state ?? null,
    () => null,
  );
}

/** Every screen that counts cards, which an import that finished or was undone has made stale. */
export const IMPORT_TOUCHES = ["decks", "queue", "rounds", "streak", "insights", "activity"];
