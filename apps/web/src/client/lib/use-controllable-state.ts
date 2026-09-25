import { useCallback, useState } from "react";

interface Options<T, Args extends unknown[]> {
  /** Leave undefined for the part to keep its own state. */
  value: T | undefined;
  defaultValue: T;
  onChange?: ((value: T, ...args: Args) => void) | undefined;
}

/**
 * A value the caller may own or leave to the part. The setter reports every change, owned or not,
 * and passes any extra arguments, such as Base UI's event details, through to `onChange`.
 */
export function useControllableState<T, Args extends unknown[] = []>({
  value,
  defaultValue,
  onChange,
}: Options<T, Args>) {
  const [own, setOwn] = useState(defaultValue);
  const controlled = value !== undefined;
  const set = useCallback(
    (next: T, ...args: Args) => {
      if (!controlled) setOwn(next);
      onChange?.(next, ...args);
    },
    [controlled, onChange],
  );
  return [controlled ? value : own, set] as const;
}
