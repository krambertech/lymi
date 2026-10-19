import { useLingui } from "@lingui/react/macro";
import { retag, type TagChoice, tagPicker } from "@lymi/client/deck-list";
import { tagsQuery } from "@lymi/client/queries";
import { TAG_LIMITS, tagKey } from "@lymi/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import { useDeckCards } from "../data/queries";
import { captureEvent } from "../telemetry/posthog";
import { SearchField } from "../ui/menu";
import { SheetGroup, SheetNote, SheetRow } from "../ui/sheet";

export { tagsSummary } from "./tag-list";

type Change = { add: string[]; remove: string[] };

/**
 * Finding, creating and ticking tags, the one way the phone does it for a card's form and for
 * chosen cards: `onChange` hears what a save would put on and take off as each tick lands.
 */
export function useTagList({
  cards,
  suggestions,
  onChange,
  onAdded,
}: {
  /** The tags each card holds as the list opens, one list per card. */
  cards: readonly (readonly string[])[];
  /** Tags in use elsewhere, offered after the ones the cards carry. */
  suggestions: readonly { name: string }[];
  onChange?: ((change: Change) => void) | undefined;
  /** A tag put on: picked from the list, or typed, and whether it was one already in use. */
  onAdded?: ((via: "suggestion" | "typed", inUse: boolean) => void) | undefined;
}) {
  const [created, setCreated] = useState<string[]>([]);
  const [choices, setChoices] = useState<ReadonlyMap<string, TagChoice>>(new Map());
  const [query, setQuery] = useState("");
  const picker = tagPicker({ cards, created, suggestions, choices, query });
  const choose = (next: ReadonlyMap<string, TagChoice>, made: string[]) => {
    setChoices(next);
    setCreated(made);
    onChange?.(tagPicker({ cards, created: made, suggestions, choices: next, query: "" }).change);
  };
  const set = (name: string, choice: TagChoice, via: "suggestion" | "typed" = "suggestion") => {
    if (choice === "all" && picker.choiceOf(name) !== "all") onAdded?.(via, true);
    choose(new Map(choices).set(tagKey(name), choice), created);
  };
  const create = () => {
    onAdded?.("typed", false);
    choose(new Map(choices).set(tagKey(picker.typed), "all"), [...created, picker.typed]);
    setQuery("");
  };
  return { picker, query, setQuery, set, create };
}

/**
 * The list `useTagList` drives: a field that finds a tag or offers Create, then each tag with a
 * check on every card, a dash on some, and on several cards how many will carry it.
 */
export function TagList({
  list,
  full = false,
  onDone,
}: {
  list: ReturnType<typeof useTagList>;
  /** The one card holds all the tags it can, so only taking one off is offered. */
  full?: boolean;
  /** Return on an empty field, which is done with the tags. */
  onDone?: (() => void) | undefined;
}) {
  const { t } = useLingui();
  const { height } = useWindowDimensions();
  const { picker, query, setQuery, set, create } = list;
  const { total, shown, typed, fresh, pick } = picker;
  return (
    <>
      <SearchField
        label={t`Tags`}
        placeholder={t`Find or create a tag`}
        // The keyboard lifts the sheet to full height, where iOS makes it opaque and a plate fill vanishes.
        fill="group"
        // Several tags go on one after another, as the chip box let them.
        stay
        query={query}
        onChange={setQuery}
        onSubmit={() => {
          if (!typed) onDone?.();
          else if (fresh && !full) create();
          else if (pick) {
            set(pick, picker.next(pick), "typed");
            setQuery("");
          }
        }}
      />
      <ScrollView
        style={{ maxHeight: height * 0.5 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {shown.length > 0 || fresh ? (
          <SheetGroup>
            {shown.map((name) => {
              const choice = picker.choiceOf(name);
              const after = picker.after(name);
              return (
                <SheetRow
                  key={tagKey(name)}
                  label={name}
                  chosen={choice === "mixed" ? "mixed" : choice === "all"}
                  multiple
                  value={total > 1 ? t`${after} of ${total}` : undefined}
                  disabled={full && choice === "none"}
                  onPress={() => set(name, picker.next(name))}
                />
              );
            })}
            {fresh && !full && (
              <SheetRow icon="plus" label={t`Create “${typed}”`} onPress={create} />
            )}
          </SheetGroup>
        ) : (
          <SheetNote>{t`No tags yet. Type one to create it.`}</SheetNote>
        )}
        {full && <SheetNote>{t`That’s the most tags a card can have`}</SheetNote>}
      </ScrollView>
    </>
  );
}

/** The tags the learner uses, this deck's first, most used first, so a card picks up the deck's own. */
export function useSuggestedTags(deckId: string | undefined, open = true) {
  const rows = useDeckCards(deckId ?? "").data;
  const all = useQuery({ ...tagsQuery, enabled: open }).data;
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? [])
      for (const tag of r.card.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    const deck = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => ({ name }));
    // Offline, the learner's other tags may not have loaded, and the deck's own still offer.
    return [...deck, ...(all ?? [])];
  }, [rows, all]);
}

interface TagsChoicesProps {
  value: string[];
  onChange: (tags: string[]) => void;
  deckId: string | undefined;
  onDone: () => void;
}

/** A card's tags in their sheet, each tick applied to the form as it lands. */
export function TagsChoices({ value, onChange, deckId, onDone }: TagsChoicesProps) {
  // The tags as the sheet opened, which every tick is measured against.
  const [start] = useState(value);
  const suggestions = useSuggestedTags(deckId);
  const list = useTagList({
    cards: [start],
    suggestions,
    onChange: (change) => onChange(retag(start, change.add, change.remove).tags),
    onAdded: (via, inUse) => captureEvent("tag_added", { via, in_use: inUse }),
  });
  return <TagList list={list} full={value.length >= TAG_LIMITS.count} onDone={onDone} />;
}
