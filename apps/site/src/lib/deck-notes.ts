import { type NoteBlock, type NoteInline, parseNotes } from "@lymi/core/notes";
import type { DeckCard } from "./deck-page";

/** About ten lines of a turned card's notes, which scroll; the rest is in Lymi once the deck is added. */
const NOTE_BUDGET = 600;
/** A list keeps this many items on a card. */
const LIST_ITEMS = 8;

/** Inline text cut to `budget` characters at a word, ending in an ellipsis when anything went. */
function trimInlines(nodes: readonly NoteInline[], budget: number): [NoteInline[], number] {
  const kept: NoteInline[] = [];
  let left = budget;
  for (const node of nodes) {
    if (left <= 0) break;
    if (node.type === "text") {
      if (node.value.length <= left) {
        kept.push(node);
        left -= node.value.length;
        continue;
      }
      const cut = node.value.slice(0, left);
      const word = cut.lastIndexOf(" ");
      kept.push({ type: "text", value: `${(word > 0 ? cut.slice(0, word) : cut).trimEnd()}…` });
      left = 0;
      break;
    }
    if (node.type === "break") {
      kept.push(node);
      left -= 1;
      continue;
    }
    const [children, used] = trimInlines(node.children, left);
    kept.push({ ...node, children });
    left -= used;
  }
  return [kept, budget - left];
}

/** A block cut to `budget` characters: a paragraph at a word, a list to its first items. */
function trimBlock(block: NoteBlock, budget: number): [NoteBlock, number] {
  if (block.type === "paragraph") {
    const [children, used] = trimInlines(block.children, budget);
    return [{ ...block, children }, used];
  }
  const items: NoteBlock[][] = [];
  let used = 0;
  for (const item of block.items.slice(0, LIST_ITEMS)) {
    if (used >= budget) break;
    const kept: NoteBlock[] = [];
    for (const inner of item) {
      if (used >= budget) break;
      const [trimmed, n] = trimBlock(inner, budget - used);
      kept.push(trimmed);
      used += n;
    }
    items.push(kept);
  }
  return [{ ...block, items }, used];
}

/**
 * The notes a hand card can hold: whole blocks from the start while they fit, and the block that
 * reaches the budget cut at a word with an ellipsis. The card has a fixed height and hides what
 * runs past it, so a long note would otherwise stop mid-line with nothing to say there was more.
 */
export function cardNotes(source: string): NoteBlock[] {
  const blocks = parseNotes(source);
  const kept: NoteBlock[] = [];
  let used = 0;
  for (const block of blocks) {
    // Too little room left to start another block says less than the ellipsis does.
    if (used >= NOTE_BUDGET || (kept.length > 0 && NOTE_BUDGET - used < 40)) break;
    const [trimmed, n] = trimBlock(block, NOTE_BUDGET - used);
    kept.push(trimmed);
    used += n;
  }
  // A cut that fell between blocks or list items says so too, so a cut note never looks whole.
  const whole = JSON.stringify(kept) === JSON.stringify(blocks.slice(0, kept.length));
  const last = kept.at(-1);
  if ((kept.length < blocks.length || !whole) && last && !endsInEllipsis(last)) {
    const more: NoteBlock = { type: "paragraph", children: [{ type: "text", value: "…" }] };
    if (last.type === "list") last.items.push([more]);
    else kept.push(more);
  }
  return kept;
}

/** Whether a block's last text already ends in the ellipsis a cut word leaves. */
function endsInEllipsis(block: NoteBlock): boolean {
  if (block.type === "list") {
    const item = block.items.at(-1);
    const inner = item?.at(-1);
    return inner ? endsInEllipsis(inner) : false;
  }
  let node = block.children.at(-1);
  while (node && node.type !== "text" && node.type !== "break") node = node.children.at(-1);
  return node?.type === "text" && node.value.endsWith("…");
}

/**
 * The front cards with their notes parsed, on the server, so the hand's script draws blocks and
 * never ships the Markdown parser or the raw text. Only the hand's cards carry notes.
 */
export function withNoteBlocks(cards: DeckCard[]): DeckCard[] {
  return cards.map((card) => {
    const notes = card.details?.notes;
    if (!notes || !card.details) return card;
    const { notes: _notes, ...details } = card.details;
    return { ...card, details, noteBlocks: cardNotes(notes) };
  });
}
