import { useLingui } from "@lingui/react/macro";
import { TAG_LIMITS } from "@lymi/core";
import { type RefObject, useMemo, useState } from "react";
import { type TextInput as Input, TextInput, View } from "react-native";
import { useDeckCards } from "../data/queries";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { Icon, Press, Text } from "../ui/primitives";
import { SheetGroup, SheetHeading, SheetRow } from "../ui/sheet";
import { useOnGlass } from "../ui/surface";
import { addTags } from "./tag-list";

export { tagsSummary } from "./tag-list";

interface TagsBoxProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** What is typed and not yet a tag, when the box's owner filters by it. */
  draft?: string;
  onDraft?: (draft: string) => void;
  autoFocus?: boolean;
  inputRef?: RefObject<Input | null>;
  /** Return on an empty field, which is done with the tags. */
  onDone?: () => void;
  /** Inside a filled box, where the tags take the plate's fill rather than the box's. */
  boxed?: boolean;
}

/** Tags typed one at a time: Return or a comma adds one, Delete on an empty field takes the last back. */
export function TagsBox({
  value,
  onChange,
  draft: held,
  onDraft,
  autoFocus,
  inputRef,
  onDone,
  boxed = false,
}: TagsBoxProps) {
  const { t } = useLingui();
  const p = usePalette();
  const glass = useOnGlass();
  const [own, setOwn] = useState("");
  const draft = held ?? own;
  const setDraft = onDraft ?? setOwn;
  const full = value.length >= TAG_LIMITS.count;
  const type = (text: string) => {
    // A pasted "streets, signs" is two tags, so the cap is per tag here rather than a maxLength that cuts the paste.
    const cut = text.lastIndexOf(",");
    if (cut === -1) return setDraft(text.slice(0, TAG_LIMITS.length));
    onChange(addTags(value, text.slice(0, cut)));
    setDraft(
      text
        .slice(cut + 1)
        .trimStart()
        .slice(0, TAG_LIMITS.length),
    );
  };
  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {value.map((tag) => (
        <Press
          key={tag}
          onPress={() => onChange(value.filter((v) => v !== tag))}
          accessibilityRole="button"
          accessibilityLabel={t`Remove the tag ${tag}`}
          hitSlop={4}
          className={`h-8 max-w-full flex-row items-center gap-1 rounded-full ps-3 pe-2 ${!glass ? "bg-plate-2" : boxed ? "bg-glass-plate" : "bg-glass-group"}`}
        >
          <Text className="shrink text-base font-medium text-text-2" numberOfLines={1}>
            {tag}
          </Text>
          <Icon name="close" size={14} colour={p.muted} />
        </Press>
      ))}
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={type}
        autoFocus={autoFocus}
        editable={!full}
        placeholder={
          full ? t`That’s the most tags a card can have` : value.length ? "" : t`Add a tag`
        }
        placeholderTextColor={p.muted}
        accessibilityLabel={t`Tags`}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={() => {
          if (!draft.trim()) return onDone?.();
          onChange(addTags(value, draft));
          setDraft("");
        }}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === "Backspace" && !draft && value.length)
            onChange(value.slice(0, -1));
        }}
        selectionColor={p.text}
        className="h-9 min-w-24 flex-1 py-1.5 font-sans text-text"
        style={{ fontSize: 17 }}
        maxFontSizeMultiplier={inputCap(17)}
      />
    </View>
  );
}

/** The tags on the deck's cards, most used first, to tick rather than type again. */
function useDeckTags(deckId: string | undefined) {
  const rows = useDeckCards(deckId ?? "").data;
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? [])
      for (const tag of r.card.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [rows]);
}

interface TagsChoicesProps {
  value: string[];
  onChange: (tags: string[]) => void;
  deckId: string | undefined;
  onDone: () => void;
}

/** The card's tags in their sheet: typed in a box, or ticked from the tags the deck's cards carry. */
export function TagsChoices({ value, onChange, deckId, onDone }: TagsChoicesProps) {
  const { t } = useLingui();
  const [draft, setDraft] = useState("");
  const deckTags = useDeckTags(deckId);
  const query = draft.trim().toLocaleLowerCase();
  const offered = [...new Set([...value, ...deckTags])].filter(
    (tag) => !query || tag.toLocaleLowerCase().includes(query),
  );
  const toggle = (tag: string) =>
    onChange(value.includes(tag) ? value.filter((v) => v !== tag) : addTags(value, tag));
  return (
    <>
      <View className="rounded-xl bg-glass-group px-3 py-2">
        <TagsBox
          value={value}
          onChange={onChange}
          draft={draft}
          onDraft={setDraft}
          autoFocus
          boxed
          onDone={onDone}
        />
      </View>
      {offered.length > 0 && (
        <>
          <SheetHeading>{t`In this deck`}</SheetHeading>
          <SheetGroup>
            {offered.map((tag) => (
              <SheetRow
                key={tag}
                label={tag}
                chosen={value.includes(tag)}
                multiple
                onPress={() => toggle(tag)}
              />
            ))}
          </SheetGroup>
        </>
      )}
    </>
  );
}
