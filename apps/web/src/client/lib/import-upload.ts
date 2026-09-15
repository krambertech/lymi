import { ApiError } from "./api";

export type UploadProgress = { sent: number; total: number };

export type SendPart = (part: number, body: Blob, signal: AbortSignal) => Promise<unknown>;

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
  file: Blob,
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
    const body = file.slice((part - 1) * partBytes, part * partBytes);
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
    sent += body.size;
    onProgress?.({ sent, total: file.size });
  }
}
