import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** What floats over the screens and blurs them, such as the open menu: outside what is blurred. */
  over?: ReactNode;
}

/**
 * What a frosted surface blurs: the app's screens. iOS's glass blurs on its own, so here it only
 * passes the screens through; blur-root.android.tsx wraps them in Android's blur target.
 */
export function BlurRoot({ children, over }: Props) {
  return (
    <>
      {children}
      {over}
    </>
  );
}
