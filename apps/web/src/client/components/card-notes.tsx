import { type NoteBlock, type NoteInline, parseNotes } from "@lymi/core/notes";
import { cn } from "cn";
import { useMemo } from "react";

function Inlines({ nodes }: { nodes: readonly NoteInline[] }) {
  return nodes.map((node, i) => {
    if (node.type === "text") return node.value;
    // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
    if (node.type === "break") return <br key={i} />;
    if (node.type === "link") {
      return (
        <a
          // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
          key={i}
          href={node.href}
          title={node.title}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text underline decoration-edge-2 underline-offset-2 hoverable:hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Inlines nodes={node.children} />
        </a>
      );
    }
    const Tag = ({ strong: "strong", emphasis: "em", underline: "u", strikethrough: "s" } as const)[
      node.type
    ];
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
      <Tag key={i} className={node.type === "strong" ? "font-semibold" : undefined}>
        <Inlines nodes={node.children} />
      </Tag>
    );
  });
}

function Blocks({ blocks }: { blocks: readonly NoteBlock[] }) {
  return blocks.map((block, i) => {
    if (block.type === "paragraph") {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
        <p key={i}>
          <Inlines nodes={block.children} />
        </p>
      );
    }
    const List = block.ordered ? "ol" : "ul";
    return (
      <List
        // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
        key={i}
        start={block.ordered && block.start !== 1 ? block.start : undefined}
        className={cn("ps-[1.25em]", block.ordered ? "list-decimal" : "list-disc")}
      >
        {block.items.map((item, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
          <li key={j} className="ps-[0.25em] marker:text-muted">
            <Blocks blocks={item} />
          </li>
        ))}
      </List>
    );
  });
}

interface Props {
  source: string;
  className?: string | undefined;
}

/** A card's notes, formatted from their Markdown subset. Text sizes and colour come from the holder. */
export function CardNotes({ source, className }: Props) {
  const blocks = useMemo(() => parseNotes(source), [source]);
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] gap-[0.5lh] [overflow-wrap:anywhere]",
        className,
      )}
    >
      <Blocks blocks={blocks} />
    </div>
  );
}
