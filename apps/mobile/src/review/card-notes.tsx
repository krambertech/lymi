import { type NoteBlock, type NoteInline, parseNotes } from "@lymi/core/notes";
import { type ReactNode, useMemo } from "react";
import { Linking, View } from "react-native";
import { Text } from "../ui/primitives";

function Inlines({ nodes }: { nodes: readonly NoteInline[] }): ReactNode {
  return nodes.map((node, i) => {
    if (node.type === "text") return node.value;
    // Notation stays as typed until phone rendering ships (docs/proposals/math-chemistry-and-code-on-cards.md).
    if (node.type === "math" || node.type === "code") return node.source;
    if (node.type === "break") return "\n";
    if (node.type === "link") {
      return (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
          key={i}
          className="text-ink underline"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(node.href)}
        >
          <Inlines nodes={node.children} />
        </Text>
      );
    }
    const style = {
      strong: { fontWeight: "600" as const },
      emphasis: { fontStyle: "italic" as const },
      underline: { textDecorationLine: "underline" as const },
      strikethrough: { textDecorationLine: "line-through" as const },
    }[node.type];
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
      <Text key={i} style={style}>
        <Inlines nodes={node.children} />
      </Text>
    );
  });
}

function Blocks({ blocks, className }: { blocks: readonly NoteBlock[]; className: string }) {
  return blocks.map((block, i) => {
    if (block.type === "paragraph") {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
        <Text key={i} className={className}>
          <Inlines nodes={block.children} />
        </Text>
      );
    }
    if (block.type === "displayMath" || block.type === "codeBlock") {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
        <Text key={i} className={className}>
          {block.source}
        </Text>
      );
    }
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
      <View key={i} className="gap-1">
        {block.items.map((item, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a note part has no identity beyond its order
          <View key={j} className="flex-row gap-2">
            <Text className={className}>{block.ordered ? `${block.start + j}.` : "•"}</Text>
            <View className="flex-1 gap-1">
              <Blocks blocks={item} className={className} />
            </View>
          </View>
        ))}
      </View>
    );
  });
}

/** A card's notes as the web draws them: paragraphs, lists, emphasis and links. */
export function CardNotes({ source, className }: { source: string; className: string }) {
  const blocks = useMemo(() => parseNotes(source), [source]);
  return (
    <View className="gap-2">
      <Blocks blocks={blocks} className={className} />
    </View>
  );
}
