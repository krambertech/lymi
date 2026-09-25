import { useState } from "react";

/**
 * A key that changes each time `open` turns true. A dialog body keyed on it starts clean on every
 * opening, however the dialog was closed, and keeps what it showed while the close animation runs.
 */
export function useOpenKey(open: boolean): number {
  const [state, setState] = useState({ open, key: 0 });
  if (state.open !== open) setState({ open, key: open ? state.key + 1 : state.key });
  return state.key;
}
