import type { ImportChoicesInput, ImportOut, ImportPreviewOut, ImportSource } from "@lymi/core";
import type { UploadBody } from "../imports";
import { request } from "./request";

export type Import = ImportOut;
export type ImportPreview = ImportPreviewOut;

export const PREVIEW_TIMEOUT_MS = 20_000;

export const importsApi = {
  import: (id: string) => request<Import>(`/api/imports/${id}`),
  startImport: (file: { name: string; size: number }, source?: ImportSource) =>
    request<Import>("/api/imports", {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, byteSize: file.size, source }),
    }),
  uploadImportPart: (id: string, part: number, body: UploadBody, signal?: AbortSignal) =>
    request<Import>(`/api/imports/${id}/parts/${part}`, {
      method: "PUT",
      body,
      headers: { "content-type": "application/octet-stream" },
      ...(signal ? { signal } : {}),
    }),
  completeImport: (id: string) =>
    request<Import>(`/api/imports/${id}/complete`, { method: "POST" }),
  previewImport: (id: string, choices: ImportChoicesInput, signal?: AbortSignal) =>
    request<ImportPreview>(`/api/imports/${id}/preview`, {
      method: "POST",
      body: JSON.stringify(choices),
      timeout: PREVIEW_TIMEOUT_MS,
      ...(signal ? { signal } : {}),
    }),
  confirmImport: (id: string, choices: ImportChoicesInput) =>
    request<Import>(`/api/imports/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify(choices),
    }),
  cancelImport: (id: string) => request<Import>(`/api/imports/${id}/cancel`, { method: "POST" }),
  archiveImport: (id: string) => request<Import>(`/api/imports/${id}/archive`, { method: "POST" }),
  restoreImport: (id: string) => request<Import>(`/api/imports/${id}/restore`, { method: "POST" }),
};
