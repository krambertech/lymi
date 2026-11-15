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
  pleco: "Pleco",
};

/** The file names each app's import page accepts, checked before anything is sent. */
export const SOURCE_FILES: Record<ImportSource, RegExp> = {
  anki: /\.(apkg|colpkg)$/i,
  mochi: /\.mochi$/i,
  noji: /\.ofc$/i,
  lymi: /\.zip$/i,
  quizlet: /\.(txt|tsv|csv)$/i,
  pleco: /\.txt$/i,
};

/** Each app's guide on the public site; Quizlet has none yet. */
export function importGuidePath(source: ImportSource): string | undefined {
  if (source === "lymi") return "/docs/export";
  if (source === "quizlet") return undefined;
  if (source === "noji") return "/docs/import-from-noji";
  if (source === "pleco") return "/docs/import-from-pleco";
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

/**
 * An upload in this app. It outlives the import screen, so moving around the app does not stop it.
 * An upload that finished or was stopped has no state: its import says the rest.
 */
export type UploadState =
  | { status: "sending"; sent: number; total: number }
  /** Every part arrived and the server is putting the file together. */
  | { status: "joining"; sent: number; total: number }
  | { status: "failed"; sent: number; total: number; error: string };

export type UploadEvent =
  | { type: "progressed"; sent: number }
  | { type: "sentAll" }
  | { type: "failed"; error: string }
  | { type: "retried" };

/** Every move an upload can make; an event its state does not allow changes nothing. */
export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  const { sent, total } = state;
  switch (event.type) {
    case "progressed":
      return state.status === "sending" ? { status: "sending", sent: event.sent, total } : state;
    case "sentAll":
      return state.status === "sending" ? { status: "joining", sent: total, total } : state;
    case "failed":
      return state.status === "failed"
        ? state
        : { status: "failed", sent, total, error: event.error };
    case "retried":
      return state.status === "failed" ? { status: "sending", sent, total } : state;
  }
}

type Entry = { state: UploadState; file: UploadSource; controller: AbortController };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Starts a run of its own; whatever ran for this import before is stopped and no longer heard. */
function begin(id: string, file: UploadSource, sent: number): Entry {
  entries.get(id)?.controller.abort();
  const entry: Entry = {
    file,
    controller: new AbortController(),
    state: { status: "sending", sent, total: file.size },
  };
  entries.set(id, entry);
  emit();
  return entry;
}

async function run(id: string, entry: Entry, qc: QueryClient, from: number) {
  // A run that was stopped or replaced says nothing more: the entry is its successor's.
  const live = () => entries.get(id) === entry;
  const step = (event: UploadEvent) => {
    if (!live()) return;
    entry.state = uploadReducer(entry.state, event);
    emit();
  };
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
        onProgress: ({ sent }) => step({ type: "progressed", sent }),
      },
    );
    step({ type: "sentAll" });
    const joined = await api.completeImport(id);
    if (!live()) return;
    qc.setQueryData(key, joined);
    entries.delete(id);
    emit();
  } catch (err) {
    step({ type: "failed", error: errorMessage(err) });
  }
}

/** Creates the import and starts sending the file. Resolves once the import exists. */
export async function startUpload(
  file: UploadSource,
  qc: QueryClient,
  source?: ImportSource,
): Promise<Import> {
  const created = await api.startImport(file, source);
  qc.setQueryData(importQuery(created.id).queryKey, created);
  void run(created.id, begin(created.id, file, 0), qc, 1);
  return created;
}

/**
 * Picks an upload back up with the same file, from the first part the server has not seen.
 * Parts go one at a time, so the parts that arrived are always the first ones.
 */
export function resumeUpload(item: Import, file: UploadSource, qc: QueryClient) {
  void run(item.id, begin(item.id, file, 0), qc, item.upload.received + 1);
}

/** Sends a failed upload's remaining parts; an upload still going is left alone. */
export function retryUpload(id: string, qc: QueryClient) {
  const failed = entries.get(id);
  if (failed?.state.status !== "failed") return;
  const partBytes = qc.getQueryData<Import>(importQuery(id).queryKey)?.upload.partBytes ?? 1;
  const from = Math.floor(failed.state.sent / partBytes) + 1;
  void run(id, begin(id, failed.file, failed.state.sent), qc, from);
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

export function uploadState(id: string): UploadState | null {
  return entries.get(id)?.state ?? null;
}

export function useUpload(id: string): UploadState | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => uploadState(id),
    () => null,
  );
}

/** Every screen that counts cards, which an import that finished or was undone has made stale. */
export const IMPORT_TOUCHES = ["decks", "queue", "rounds", "streak", "insights", "activity"];
