import { useLingui } from "@lingui/react/macro";
import { retag, type TagChoice, tagPicker } from "@lymi/client/deck-list";
import { tagsQuery } from "@lymi/client/queries";
import { isolate, TAG_LIMITS, tagKey } from "@lymi/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import { useDeckCards } from "../data/queries";
import { formatList } from "../i18n/list";
import { captureEvent } from "../telemetry/posthog";
import { SearchField } from "../ui/menu";
import { SheetGroup, SheetNote, SheetRow } from "../ui/sheet";

export { tagsSummary } from "./tag-list";

type Change = { add: string[]; remove: string[] };
/** How a tag came to go on, for `tag_added`. */
type Added = { via: "suggestion" | "typed"; inUse: boolean };

/** The names typed in the field, a comma between them, each once. */
const typedNames = (query: string) =>
  query
    .split(",")
    .map((name) => name.trim().slice(0, TAG_LIMITS.length))
    .filter((name, i, all) => name && all.findIndex((o) => tagKey(o) === tagKey(name)) === i);

/**
 * Finding, creating and ticking tags, the one way the phone does it for a card's form and for
 * chosen cards. The ticks are a draft: `settle` gives the change a save makes, typed text included.
 */
export function useTagList({
  cards,
  suggestions,
}: {
  /** The tags each card holds as the list opens, one list per card. */
  cards: readonly (readonly string[])[];
  /** Tags in use elsewhere, offered after the ones the cards carry. */
  suggestions: readonly { name: string }[];
}) {
  const [created, setCreated] = useState<string[]>([]);
  const [choices, setChoices] = useState<ReadonlyMap<string, TagChoice>>(new Map());
  const [query, setQuery] = useState("");
  const how = useRef(new Map<string, Added>());
  const picker = tagPicker({ cards, created, suggestions, choices, query });
  const only = cards.length === 1 ? cards[0] : undefined;

  /**
   * Puts on each typed name, never taking one off: a known tag is ticked, a new one made. A card
   * stops taking tags at its limit.
   */
  const typedInto = (next: Map<string, TagChoice>, made: string[]) => {
    const now = tagPicker({ cards, created: made, suggestions, choices: next, query: "" });
    let room = only
      ? TAG_LIMITS.count - retag(only, now.change.add, now.change.remove).tags.length
      : Number.POSITIVE_INFINITY;
    for (const name of typedNames(query)) {
      const known = now.offered.find((o) => tagKey(o) === tagKey(name));
      if (known && now.choiceOf(known) === "all") continue;
      if (room <= 0) break;
      room -= 1;
      how.current.set(tagKey(name), { via: "typed", inUse: !!known });
      if (!known) made.push(name);
      next.set(tagKey(name), "all");
    }
    return { next, made };
  };
  const set = (name: string, choice: TagChoice) => {
    if (choice === "all") how.current.set(tagKey(name), { via: "suggestion", inUse: true });
    setChoices(new Map(choices).set(tagKey(name), choice));
  };
  /** Return, or the Create row: what is typed goes on. */
  const submit = () => {
    const { next, made } = typedInto(new Map(choices), [...created]);
    setChoices(next);
    setCreated(made);
    setQuery("");
  };
  /** The change a save makes now, with anything still typed put on as Return would. */
  const settle = (): Change => {
    const { next, made } = typedInto(new Map(choices), [...created]);
    return tagPicker({ cards, created: made, suggestions, choices: next, query: "" }).change;
  };
  const howAdded = (name: string): Added =>
    how.current.get(tagKey(name)) ?? { via: "suggestion", inUse: true };
  return { picker, query, setQuery, set, submit, settle, howAdded };
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
  const { t, i18n } = useLingui();
  const { height } = useWindowDimensions();
  const { picker, query, setQuery, set, submit } = list;
  const { total, typed: entered } = picker;
  const names = typedNames(query);
  const fresh = names.filter((name) => !picker.offered.some((o) => tagKey(o) === tagKey(name)));
  // Several names typed: the known ones they name, rather than any that hold the whole text.
  const shown =
    names.length > 1
      ? picker.offered.filter((o) => names.some((name) => tagKey(name) === tagKey(o)))
      : picker.shown;
  const creating = fresh.length > 0 && !full;
  // The one new name, or every new name, that Create makes.
  const typed = fresh[0] ?? "";
  const listed = formatList(
    fresh.map((name) => `“${isolate(name)}”`),
    i18n.locale,
  );
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
        onSubmit={() => (entered ? submit() : onDone?.())}
      />
      <ScrollView
        style={{ maxHeight: height * 0.5 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {shown.length > 0 || creating ? (
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
            {creating && (
              <SheetRow
                icon="plus"
                label={
                  fresh.length === 1
                    ? t`Create “${{ typed: isolate(typed) }}”`
                    : t`Create ${listed}`
                }
                onPress={submit}
              />
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
  /** The card's tags once the sheet's ✓ applies them. */
  onChange: (tags: string[]) => void;
  deckId: string | undefined;
  /** The sheet's ✓ from inside it: Return on an empty field. */
  onDone: () => void;
  /** Hands the sheet's ✓ what to apply. */
  keep: (apply: () => void) => void;
}

/**
 * A card's tags in their sheet, ticked as a draft that the sheet's ✓ applies, with anything still
 * typed. `tag_added` goes for each tag that joins the card then, so one dropped with close never counts.
 */
export function TagsChoices({ value, onChange, deckId, onDone, keep }: TagsChoicesProps) {
  // The tags as the sheet opened, which every tick is measured against.
  const [start] = useState(value);
  const suggestions = useSuggestedTags(deckId);
  const list = useTagList({ cards: [start], suggestions });
  const { add, remove } = list.picker.change;
  const now = retag(start, add, remove).tags;
  // Registered on every render, so ✓ applies the latest draft.
  useEffect(() =>
    keep(() => {
      const change = list.settle();
      const tags = retag(start, change.add, change.remove).tags;
      for (const tag of tags) {
        if (start.some((s) => tagKey(s) === tagKey(tag))) continue;
        const { via, inUse } = list.howAdded(tag);
        captureEvent("tag_added", { via, in_use: inUse });
      }
      onChange(tags);
    }),
  );
  return <TagList list={list} full={now.length >= TAG_LIMITS.count} onDone={onDone} />;
}
