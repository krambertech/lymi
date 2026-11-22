import { type Mutation, MutationCache, type MutationObserver } from "@tanstack/react-query";
import { errorMessage } from "./api";

export type FailureShown =
  | { failure: "inline" }
  | { failure: "caller" }
  | { failure: "silent"; because: string };

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: FailureShown;
  }
}

// oxlint-disable-next-line typescript/no-explicit-any -- the cache's own events carry this type
type Observer = MutationObserver<any, any, any, any>;
type Write = Mutation<unknown, unknown, unknown, unknown>;

export function failedWriteCache(show: (message: string) => void): MutationCache {
  const watching = new WeakMap<object, Set<Observer>>();
  const onScreen = (write: Write) =>
    [...(watching.get(write) ?? [])].some((observer) => observer.hasListeners());
  const replaced = ({ options: { scope }, mutationId }: Write) =>
    scope !== undefined &&
    cache
      .getAll()
      .some((later) => later.options.scope?.id === scope.id && later.mutationId > mutationId);

  const cache = new MutationCache({
    onError: (error, _variables, _onMutateResult, write) => {
      switch (write.meta?.failure) {
        case "silent":
        case "caller":
          return;
        case "inline":
          if (!onScreen(write) && !replaced(write)) show(errorMessage(error));
          return;
        case undefined:
          if (!write.options.onError) show(errorMessage(error));
      }
    },
  });
  cache.subscribe((event) => {
    if (event.type === "observerAdded") {
      const observers = watching.get(event.mutation) ?? new Set<Observer>();
      watching.set(event.mutation, observers.add(event.observer));
    } else if (event.type === "observerRemoved") {
      watching.get(event.mutation)?.delete(event.observer);
    }
  });
  return cache;
}
