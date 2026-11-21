import type { NoteBlock, NoteInline } from "@lymi/core/notes";
import { clsx } from "clsx";

// Drawn from blocks parsed on the server, so a page's script never carries the Markdown parser.
// The product's `CardNotes` draws the same subset; docs/design/library-decks-and-cards.md#notes.

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
          rel="noopener noreferrer nofollow"
          className="text-ink underline decoration-edge-strong underline-offset-2"
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
        className={clsx("ps-[1.25em]", block.ordered ? "list-decimal" : "list-disc")}
      >
        {block.items.map((item, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
          <li key={j} className="ps-[0.25em] marker:text-ink-faint">
            <Blocks blocks={item} />
          </li>
        ))}
      </List>
    );
  });
}

/** A card's notes from their parsed blocks. Text size and colour come from the holder. */
export function NoteBlocks({
  blocks,
  className,
}: {
  blocks: readonly NoteBlock[];
  className?: string | undefined;
}) {
  return (
    <div
      dir="auto"
      className={clsx(
        "grid grid-cols-[minmax(0,1fr)] gap-[0.35lh] [overflow-wrap:anywhere]",
        className,
      )}
    >
      <Blocks blocks={blocks} />
    </div>
  );
}
