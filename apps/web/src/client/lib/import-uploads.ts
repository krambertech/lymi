import type { QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api, errorMessage, type Import } from "./api";
import { uploadInParts } from "./import-upload";

/** An upload in this tab. It outlives the import screen, so moving around the app does not stop it. */
export type UploadState = {
  sent: number;
  total: number;
  status: "sending" | "joining" | "failed";
  error?: string | undefined;
};

type Entry = { state: UploadState; file: File; controller: AbortController };

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
  try {
    const current = qc.getQueryData<Import>(["imports", id]) ?? (await api.import(id));
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
    qc.setQueryData(["imports", id], await api.completeImport(id));
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
export async function startUpload(file: File, qc: QueryClient): Promise<Import> {
  const created = await api.startImport(file);
  qc.setQueryData(["imports", created.id], created);
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
export function resumeUpload(item: Import, file: File, qc: QueryClient) {
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
      entry.state.sent / (qc.getQueryData<Import>(["imports", id])?.upload.partBytes ?? 1),
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

/** Whether a tab-local upload is still going, for the unload warning. */
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
