import type { ComponentType, ReactNode } from "react";

/** One component on a group's page. A group of one uses its lede for the note. */
export interface Entry {
  slug: string;
  name: string;
  note?: ReactNode | undefined;
  /** Path under `apps/web/src/client`. */
  source: string;
  Demo: ComponentType;
}

export interface Group {
  slug: string;
  title: string;
  lede: string;
  entries: Entry[];
}

export const noop = () => {};
