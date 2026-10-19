import {
  blobSource,
  resumeUpload as resume,
  startUpload as start,
  type UploadState,
} from "@lymi/client/imports";
import type { ImportSource } from "@lymi/core";
import type { QueryClient } from "@tanstack/react-query";
import type { Import } from "./api";

export { retryUpload, stopUpload, uploading, useUpload } from "@lymi/client/imports";
export type { UploadState };

/** Creates the import and starts sending the file. Resolves once the import exists. */
export function startUpload(file: File, qc: QueryClient, source?: ImportSource): Promise<Import> {
  return start(blobSource(file), qc, source);
}

/** Picks an upload back up with the same file, from the first part the server has not seen. */
export function resumeUpload(item: Import, file: File, qc: QueryClient) {
  resume(item, blobSource(file), qc);
}
