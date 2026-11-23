import { useSyncExternalStore } from "react";

interface Options<T> {
  key: string;
  version: number;
  empty: T;
  clean: (raw: Record<string, unknown>) => T;
}

export interface BrowserStore<T> {
  read: (storage?: Storage | null) => T;
  current: () => T;
  update: (change: (value: T) => T, storage?: Storage | null) => void;
  use: () => T;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function browserStore<T>({ key, version, empty, clean }: Options<T>): BrowserStore<T> {
  const listeners = new Set<() => void>();
  let snapshot: T | null = null;
  let storageHoldsSnapshot = true;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const read = (storage: Storage | null = localStorageOrNull()): T => {
    try {
      const raw: unknown = JSON.parse(storage?.getItem(key) ?? "null");
      return isRecord(raw) && raw.v === version ? clean(raw) : empty;
    } catch {
      return empty;
    }
  };

  const current = () => (snapshot ??= read());

  const latest = (storage?: Storage | null): T => {
    if (storage !== undefined) return read(storage);
    return localStorageOrNull() && storageHoldsSnapshot ? read() : current();
  };

  const update = (change: (value: T) => T, storage?: Storage | null) => {
    const before = latest(storage);
    const next = change(before);
    if (next === before) return;
    try {
      const target = storage === undefined ? localStorageOrNull() : storage;
      target?.setItem(key, JSON.stringify({ v: version, ...next }));
    } catch {
      storageHoldsSnapshot = false;
    }
    snapshot = next;
    emit();
  };

  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== key) return;
    snapshot = read();
    emit();
  };

  const subscribe = (listener: () => void) => {
    if (listeners.size === 0) addEventListener("storage", fromOtherTab);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) removeEventListener("storage", fromOtherTab);
    };
  };

  const use = () => useSyncExternalStore(subscribe, current, () => empty);

  return { read, current, update, use };
}
