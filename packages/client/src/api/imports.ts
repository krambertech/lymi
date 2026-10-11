import type { ImportChoicesInput, ImportOut, ImportPreviewOut } from "@lymi/core";
import { request } from "./request";

export type Import = ImportOut;
export type ImportPreview = ImportPreviewOut;

export const importsApi = {
  import: (id: string) => request<Import>(`/api/imports/${id}`),
  startImport: (file: { name: string; size: number }) =>
    request<Import>("/api/imports", {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, byteSize: file.size }),
    }),
  /** One part of the file. A Blob body carries its own length, which the route requires. */
  uploadImportPart: (id: string, part: number, body: Blob, signal?: AbortSignal) =>
    request<Import>(`/api/imports/${id}/parts/${part}`, {
      method: "PUT",
      body,
      headers: { "content-type": "application/octet-stream" },
      ...(signal ? { signal } : {}),
    }),
  completeImport: (id: string) =>
    request<Import>(`/api/imports/${id}/complete`, { method: "POST" }),
  previewImport: (id: string, choices: ImportChoicesInput) =>
    request<ImportPreview>(`/api/imports/${id}/preview`, {
      method: "POST",
      body: JSON.stringify(choices),
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
