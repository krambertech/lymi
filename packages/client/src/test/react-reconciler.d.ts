declare module "react-reconciler" {
  import type { ReactNode } from "react";

  type Reported = (error: unknown) => void;

  interface Reconciler {
    createContainer(
      container: object,
      tag: number,
      hydration: null,
      strict: boolean,
      concurrent: null,
      prefix: string,
      onUncaught: Reported,
      onCaught: Reported,
      onRecoverable: Reported,
      onTransition: () => void,
    ): object;
    updateContainer(element: ReactNode, root: object, parent: null, done: null): void;
  }

  export default function createReconciler(host: Record<string, unknown>): Reconciler;
}

declare module "react-reconciler/constants" {
  export const ConcurrentRoot: number;
  export const DefaultEventPriority: number;
}
