import { type Ref, type RefCallback, useCallback } from "react";

function assign<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") return ref(node);
  if (ref) ref.current = node;
}

/** One ref for a part's own and its caller's, stable while both are. */
export function useMergedRefs<T>(a: Ref<T> | undefined, b: Ref<T> | undefined): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      const cleanups = [assign(a, node), assign(b, node)];
      return () => {
        for (const [i, ref] of [a, b].entries()) {
          const cleanup = cleanups[i];
          if (typeof cleanup === "function") cleanup();
          else assign(ref, null);
        }
      };
    },
    [a, b],
  );
}
