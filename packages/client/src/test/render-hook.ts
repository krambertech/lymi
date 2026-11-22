import { type ComponentType, createContext, createElement, type ReactNode, useEffect } from "react";
import createReconciler from "react-reconciler";
import { ConcurrentRoot, DefaultEventPriority } from "react-reconciler/constants";

const nothing = () => undefined;
const drawsElement = () => {
  throw new Error(
    "renderHook draws nothing: a test of an element is a component test in a browser",
  );
};

let priority = 0;

const host = createReconciler({
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  warnsIfNotActing: true,
  noTimeout: -1,
  scheduleTimeout: (run: () => void, ms: number) => setTimeout(run, ms),
  cancelTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  setCurrentUpdatePriority: (next: number) => {
    priority = next;
  },
  getCurrentUpdatePriority: () => priority,
  resolveUpdatePriority: () => priority || DefaultEventPriority,
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1,
  trackSchedulerEvent: nothing,
  shouldAttemptEagerTransition: () => false,
  requestPostPaintCallback: nothing,
  getRootHostContext: () => null,
  getChildHostContext: () => null,
  prepareForCommit: () => null,
  resetAfterCommit: nothing,
  clearContainer: nothing,
  detachDeletedInstance: nothing,
  maySuspendCommit: () => false,
  startSuspendingCommit: () => null,
  waitForCommitToBeReady: () => null,
  NotPendingTransition: null,
  HostTransitionContext: createContext(null),
  createInstance: drawsElement,
  createTextInstance: drawsElement,
});

export interface RenderedHook<T> {
  readonly current: T;
  readonly renders: number;
  unmount(): void;
}

export function renderHook<T>(
  use: () => T,
  wrapper: ComponentType<{ children: ReactNode }>,
): RenderedHook<T> {
  let value: { current: T } | null = null;
  let renders = 0;
  let failure: { error: unknown } | null = null;
  const failed = (error: unknown) => {
    failure = { error };
  };

  function Probe() {
    const current = use();
    useEffect(() => {
      value = { current };
      renders += 1;
    });
    return null;
  }

  const root = host.createContainer(
    {},
    ConcurrentRoot,
    null,
    false,
    null,
    "",
    failed,
    failed,
    failed,
    nothing,
  );
  const mounted = createElement(wrapper, null, createElement(Probe));
  host.updateContainer(mounted, root, null, null);

  return {
    get current() {
      if (failure) throw failure.error;
      if (!value) throw new Error("the hook has not rendered");
      return value.current;
    },
    get renders() {
      return renders;
    },
    unmount: () => host.updateContainer(null, root, null, null),
  };
}
