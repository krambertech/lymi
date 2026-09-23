import { useCallback, useState } from "react";

const NONE: ReadonlySet<string> = new Set();

/**
 * The ids that joined `ids` after it first loaded within `scope`, so a card that lands while the
 * list is open can arrive rather than appear. Rows a filter hides and shows again never count.
 */
export function useArrivals(
  scope: string,
  ids: readonly string[] | undefined,
): { arrived: ReadonlySet<string>; settle: (id: string) => void } {
  const [state, setState] = useState<{
    scope: string;
    ids: readonly string[] | undefined;
    seen: ReadonlySet<string> | null;
    fresh: ReadonlySet<string>;
  }>({ scope, ids: undefined, seen: null, fresh: NONE });

  // Once a row has arrived it is an ordinary row, so nothing it holds stays clipped.
  const settle = useCallback((id: string) => {
    setState((s) => {
      if (!s.fresh.has(id)) return s;
      const fresh = new Set(s.fresh);
      fresh.delete(id);
      return { ...s, fresh };
    });
  }, []);

  if (scope !== state.scope || (ids && ids !== state.ids)) {
    const seen = scope === state.scope ? state.seen : null;
    const next = nextArrivals(seen, ids);
    setState({ scope, ids, ...next });
    return { arrived: next.fresh, settle };
  }
  return { arrived: state.fresh, settle };
}

export function nextArrivals(seen: ReadonlySet<string> | null, ids: readonly string[] | undefined) {
  if (!ids) return { seen, fresh: NONE };
  if (!seen) return { seen: new Set(ids), fresh: NONE };
  const fresh = ids.filter((id) => !seen.has(id));
  if (fresh.length === 0) return { seen, fresh: NONE };
  return { seen: new Set([...seen, ...fresh]), fresh: new Set(fresh) };
}
