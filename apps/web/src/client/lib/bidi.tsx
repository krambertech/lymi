import type { TransRenderProps } from "@lingui/react";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

const ISOLATED = /⁨([^⁨⁩]*)⁩/;

/**
 * Text that `isolate()` wrapped, drawn in `<bdi>`: WebKit ignores the isolate characters
 * themselves, so on an iPhone an Arabic term would still reorder the sentence around it.
 */
export function bidi(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    if (!ISOLATED.test(node)) return node;
    // biome-ignore lint/suspicious/noArrayIndexKey: runs of one string in a fixed order
    return node.split(ISOLATED).map((run, i) => (i % 2 ? <bdi key={i}>{run}</bdi> : run));
  }
  if (Array.isArray(node)) return Children.map(node, bidi);
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    return cloneElement(
      node as ReactElement<{ children?: ReactNode }>,
      {},
      bidi(node.props.children),
    );
  }
  return node;
}

/** Lingui's renderer for every `<Trans>`, so its isolated values draw in `<bdi>`. */
export function BidiTrans({ translation }: TransRenderProps) {
  return <>{bidi(translation)}</>;
}
