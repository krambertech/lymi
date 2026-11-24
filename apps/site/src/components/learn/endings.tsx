import type { TransRenderProps } from "@lingui/react";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { endingPieces } from "../../lib/learn/endings";

function keep(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    const pieces = endingPieces(node);
    if (!pieces.some((piece) => piece.ending)) return node;
    let at = 0;
    return pieces.map((piece) => {
      const key = at;
      at += piece.text.length;
      return piece.ending ? (
        <span key={key} className="whitespace-nowrap">
          {piece.text}
        </span>
      ) : (
        piece.text
      );
    });
  }
  if (Array.isArray(node)) return Children.map(node, keep);
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined)
    return cloneElement(
      node as ReactElement<{ children?: ReactNode }>,
      {},
      keep(node.props.children),
    );
  return node;
}

export function KeepEndings({ translation }: TransRenderProps) {
  return <>{keep(translation)}</>;
}

export function Endings({ children }: { children: ReactNode }) {
  return <>{keep(children)}</>;
}
