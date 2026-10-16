import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { LessonQuestion, LessonTerm } from "@lymi/client/api";
import type { LessonAccessOut } from "@lymi/core";
import { PLATE_ARRIVE, PLATE_RISE } from "@lymi/design";
import * as Haptics from "expo-haptics";
import { type RefObject, useEffect, useState } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import Animated, { FadeOut, Keyframe } from "react-native-reanimated";
import { ALWAYS, CROSSFADE, timed, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { inputCap, MULTILINE } from "../theme/type";
import { Chip } from "../ui/chip";
import type { IconName } from "../ui/icons";
import { Icon, IconButton, Plate, Press, Text } from "../ui/primitives";
import { MAX_FILES, type Page, wordCount } from "./material";
import { RollingCount, ScanStage } from "./scan-stage";

export type Daily = NonNullable<LessonAccessOut["daily"]>;

/** About how long a page takes, so the scan moves on while the one request runs. */
const SECONDS_A_PAGE = 6;

const { duration, easing } = timed(PLATE_ARRIVE);
/** A row of the list arrives as a plate does, one after another down the list. */
const rise = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: PLATE_RISE }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing },
  })
    .duration(duration)
    .delay(Math.min(i, 12) * 35)
    .reduceMotion(ALWAYS);

/** Smart add's name in its header, with the beta's chip. */
export function SmartAddTitle() {
  const { t } = useLingui();
  return (
    <View className="flex-row items-center gap-2" accessible accessibilityRole="header">
      <Text className="text-md font-medium text-text">{t`Smart add`}</Text>
      <Chip size="sm">{t`Beta`}</Chip>
    </View>
  );
}

interface Source {
  id: string;
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}

export function InputStep({
  pages,
  text,
  onRemovePage,
  onEditText,
  onRemoveText,
  sources,
  error,
  daily,
  online,
}: {
  pages: Page[];
  text: string;
  onRemovePage: (id: string) => void;
  onEditText: () => void;
  onRemoveText: () => void;
  sources: Source[];
  error: string | undefined;
  daily: Daily | null;
  online: boolean;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const words = wordCount(text);
  const empty = pages.length === 0 && words === 0;
  const atLimit = daily !== null && daily.used >= daily.limit;
  const full = pages.length >= MAX_FILES;
  const limit = daily?.limit ?? null;
  return (
    <View className="gap-5">
      {atLimit && daily ? (
        <LimitNotice daily={daily} />
      ) : (
        <Text className="text-base text-text-2">
          {t`Add the lesson in any form, or several at once. You choose which terms become cards.`}
        </Text>
      )}

      {!empty && (
        <Plate className="overflow-hidden">
          {pages.map((page, i) => {
            // Photos are numbered among themselves, so a PDF ahead of them takes no number.
            const n = pages.slice(0, i + 1).filter((q) => q.kind === "photo").length;
            const name = page.kind === "pdf" ? page.name : t`Page ${n}`;
            return (
              <Animated.View
                key={page.id}
                entering={rise(0)}
                exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
                className={`flex-row items-center gap-3 py-2.5 ps-3 pe-1.5 ${i > 0 ? "border-t border-edge" : ""}`}
              >
                <Thumb page={page} />
                <View className="flex-1">
                  <Text className="text-md text-text" numberOfLines={1}>
                    {name}
                  </Text>
                  <Text className="text-sm text-muted">
                    {page.kind === "pdf" ? t`PDF` : t`Photo`}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  size="sm"
                  label={t`Remove ${name}`}
                  onPress={() => onRemovePage(page.id)}
                />
              </Animated.View>
            );
          })}
          {words > 0 && (
            <Animated.View
              entering={rise(0)}
              className={`flex-row items-center gap-3 py-2.5 ps-3 pe-1.5 ${pages.length > 0 ? "border-t border-edge" : ""}`}
            >
              <Tile icon="example" />
              <Press
                onPress={onEditText}
                accessibilityRole="button"
                accessibilityHint={t`Edit the text`}
                className="flex-1"
              >
                <Text className="text-md text-text" numberOfLines={1}>
                  {text.trim().slice(0, 160)}
                </Text>
                <Text className="text-sm text-muted">
                  {t`Text · ${plural(words, { one: "# word", other: "# words" })}`}
                </Text>
              </Press>
              <IconButton
                icon="close"
                size="sm"
                label={t`Remove the text`}
                onPress={onRemoveText}
              />
            </Animated.View>
          )}
        </Plate>
      )}

      <View className="gap-2">
        {!empty && <Text className="ps-4 text-sm font-medium text-muted">{t`Add more`}</Text>}
        <Plate className="overflow-hidden">
          {sources.map((source, i) => {
            // Text is never full, and a lesson may still take text with ten pages.
            const off = atLimit || !online || (full && source.id !== "text");
            return (
              <Pressable
                key={source.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  source.onPress();
                }}
                disabled={off}
                accessibilityRole="button"
                accessibilityLabel={source.label}
                accessibilityHint={source.hint}
                accessibilityState={{ disabled: off }}
                className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
                style={({ pressed }) => (pressed ? { backgroundColor: p.hover } : null)}
              >
                <View
                  className={`size-10 items-center justify-center rounded-full bg-plate-2 ${off ? "opacity-45" : ""}`}
                >
                  <Icon name={source.icon} size={20} colour={p.text} />
                </View>
                <View className="flex-1">
                  <Text className="text-md font-medium" style={{ color: off ? p.muted : p.text }}>
                    {source.label}
                  </Text>
                  <Text className="text-sm text-muted">
                    {!online ? t`Needs a connection` : source.hint}
                  </Text>
                </View>
                <Icon name="forward" size={18} colour={p.faint} />
              </Pressable>
            );
          })}
        </Plate>
      </View>

      {error && (
        <View className="flex-row items-start gap-1.5 px-1" accessibilityLiveRegion="polite">
          <Icon name="alert" size={14} colour={p.danger} />
          <Text className="flex-1 text-base text-danger">{error}</Text>
        </View>
      )}

      <Text className="px-1 text-sm text-muted">
        {empty
          ? t`Up to ${MAX_FILES} photos or PDFs, and any amount of text.`
          : words > 0 && pages.length > 0
            ? t`${plural(pages.length, { one: "# file", other: "# files" })} and text`
            : pages.length > 0
              ? t`${plural(pages.length, { one: "# file", other: "# files" })} · up to ${MAX_FILES}`
              : t`${plural(words, { one: "# word", other: "# words" })}`}
        {limit !== null &&
          ` ${t`${plural(limit, { one: "Smart add is in beta, so it reads up to # lesson a day.", other: "Smart add is in beta, so it reads up to # lessons a day." })} A lesson it couldn’t read doesn’t count, and the count starts again at midnight.`}`}
      </Text>
    </View>
  );
}

/** The warning above the dimmed sources once today's reads are used, saying when more open. */
function LimitNotice({ daily }: { daily: Daily }) {
  const { t } = useLingui();
  const p = usePalette();
  const minutes = Math.max(1, Math.ceil((Date.parse(daily.resetsAt) - Date.now()) / 60_000));
  const hours = Math.max(1, Math.round(minutes / 60));
  const { limit } = daily;
  return (
    <View className="flex-row gap-3 rounded-xl bg-amber-soft p-4" accessible>
      <Icon name="time" size={20} colour={p["amber-text"]} />
      <View className="flex-1 gap-0.5">
        <Text className="text-md font-medium text-amber-text">
          {t`${plural(limit, { one: "You’ve used today’s # lesson", other: "You’ve used today’s # lessons" })}`}
        </Text>
        <Text className="text-base text-text-2">
          {minutes < 60
            ? t`${plural(minutes, { one: "You can add more lessons in # minute.", other: "You can add more lessons in # minutes." })}`
            : t`${plural(hours, { one: "You can add more lessons in # hour.", other: "You can add more lessons in # hours." })}`}
        </Text>
      </View>
    </View>
  );
}

function Thumb({ page }: { page: Page }) {
  if (page.kind === "pdf") return <Tile icon="lesson" />;
  return (
    <Image
      source={{ uri: page.uri }}
      className="size-10 rounded-md"
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
}

function Tile({ icon }: { icon: IconName }) {
  const p = usePalette();
  return (
    <View className="size-10 items-center justify-center rounded-md bg-plate-2">
      <Icon name={icon} size={20} colour={p["text-2"]} />
    </View>
  );
}

/** The lesson's text, pasted or typed, in a tall box with the keyboard up. */
export function WritingStep({
  text,
  onChange,
  inputRef,
}: {
  text: string;
  onChange: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const words = wordCount(text);
  return (
    <View className="gap-2">
      <TextInput
        ref={inputRef}
        autoFocus
        multiline
        value={text}
        onChangeText={onChange}
        placeholder={t`Paste a transcript, your notes or the lesson’s text`}
        placeholderTextColor={p.muted}
        accessibilityLabel={t`Lesson text`}
        // The lesson is in the language being learned, which autocorrect gets wrong.
        autoCorrect={false}
        selectionColor={p.text}
        className="min-h-64 rounded-xl border border-edge bg-plate px-4 py-3 font-sans text-md text-text"
        style={MULTILINE}
        maxFontSizeMultiplier={inputCap(17)}
      />
      {words > 0 && (
        <Text className="px-1 text-sm text-muted">
          {t`${plural(words, { one: "# word", other: "# words" })}`}
        </Text>
      )}
    </View>
  );
}

export function ReadingStep({
  pages,
  text,
  terms,
  finished,
}: {
  pages: Page[];
  text: string;
  /** The new terms found so far, in the order the model wrote them. */
  terms: LessonTerm[];
  finished: boolean;
}) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 0.5), 500);
    return () => clearInterval(tick);
  }, []);
  const found = terms.length;
  // Pages are scanned on a clock, since the one request says nothing until words arrive.
  const scanned = finished
    ? pages.length
    : Math.min(Math.floor(elapsed / SECONDS_A_PAGE), pages.length);
  const current = Math.min(scanned, Math.max(pages.length - 1, 0));
  const read = finished || found > 0 || (pages.length > 0 ? scanned >= pages.length : elapsed >= 3);
  const stage = !read
    ? pages.length > 1
      ? t`Reading page ${scanned + 1} of ${pages.length}`
      : pages.length > 0
        ? t`Reading the pages`
        : t`Reading the text`
    : finished
      ? t`Checking your decks for duplicates`
      : t`Choosing the terms worth a card`;
  const latest = terms.at(-1);
  return (
    <View className="flex-1 items-center justify-center gap-6 py-6">
      <ScanStage pages={pages} text={text} finished={finished} current={current} />
      <View className="items-center">
        <RollingCount value={found} />
        <Text className="text-sm text-muted">
          {t`${plural(found, { one: "term found", other: "terms found" })}`}
        </Text>
      </View>
      <View className="h-6 items-center" accessibilityLiveRegion="polite">
        <Animated.View
          key={stage}
          entering={reduce ? CROSSFADE : rise(0)}
          className="flex-row items-center gap-2"
        >
          <View className="size-1.5 rounded-full bg-amber" />
          <Text className="text-sm text-text-2">{stage}</Text>
        </Animated.View>
      </View>
      {/* The last term found, so the list is visibly filling while the pages are read. */}
      <View className="h-7 items-center" accessibilityElementsHidden>
        {latest && (
          <Animated.View
            key={latest.id}
            entering={reduce ? CROSSFADE : rise(0)}
            exiting={FadeOut.duration(150).reduceMotion(ALWAYS)}
            className="absolute flex-row items-center gap-2 rounded-full bg-plate-2 px-3 py-1"
          >
            <Text className="text-sm font-medium text-text" numberOfLines={1}>
              {latest.term}
            </Text>
            <Text className="shrink text-sm text-muted" numberOfLines={1}>
              {latest.gloss}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/** The option index that stands for an answer in the learner's own words. */
export const OWN_ANSWER = -1;

export function QuestionsStep({
  questions,
  answers,
  ownAnswers,
  onAnswer,
  onOwnAnswer,
}: {
  questions: LessonQuestion[];
  answers: number[];
  ownAnswers: string[];
  onAnswer: (index: number, value: number) => void;
  onOwnAnswer: (index: number, value: string) => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <View className="gap-6">
      <Text className="text-base text-text-2">
        {questions.length > 1
          ? t`A few things before the list. The usual answer is already chosen.`
          : t`One thing before the list. The usual answer is already chosen.`}
      </Text>
      {questions.map((question, index) => {
        const chosen = answers[index] ?? question.default;
        return (
          <View key={question.id} className="gap-2.5">
            <Text className="px-1 text-md font-medium text-text">{question.question}</Text>
            <Plate className="overflow-hidden" accessibilityRole="radiogroup">
              {question.options.map((option, i) => (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onAnswer(index, i);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen === i }}
                  className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-edge" : ""}`}
                  style={({ pressed }) => (pressed ? { backgroundColor: p.hover } : null)}
                >
                  <Text className="flex-1 text-md text-text">{option.label}</Text>
                  <Radio on={chosen === i} />
                </Pressable>
              ))}
              {/* The learner's own answer is the last option, typed where its label would be. */}
              <View className="flex-row items-center gap-3 border-t border-edge px-4">
                <TextInput
                  value={ownAnswers[index] ?? ""}
                  onFocus={() => onAnswer(index, OWN_ANSWER)}
                  onChangeText={(value) => {
                    onOwnAnswer(index, value);
                    if (chosen !== OWN_ANSWER) onAnswer(index, OWN_ANSWER);
                  }}
                  placeholder={t`Something else…`}
                  placeholderTextColor={p.muted}
                  accessibilityLabel={t`Something else`}
                  maxLength={300}
                  returnKeyType="done"
                  selectionColor={p.text}
                  className="min-h-[52px] flex-1 py-3 font-sans text-md text-text"
                  maxFontSizeMultiplier={inputCap(17)}
                />
                <Radio on={chosen === OWN_ANSWER} />
              </View>
            </Plate>
          </View>
        );
      })}
    </View>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <View
      className={`size-[22px] items-center justify-center rounded-full border-2 ${on ? "border-text" : "border-edge-2"}`}
    >
      {on && <View className="size-2.5 rounded-full bg-text" />}
    </View>
  );
}

/** What the learner changed on a term before adding it. */
export interface TermEdit {
  term: string;
  /** Null leaves the meaning for the AI to write; left out, it stays as the list had it. */
  meaning?: string | null;
}

export function ListStep({
  fresh,
  existing,
  ticked,
  edits,
  onToggle,
  onToggleAll,
  onOpen,
  error,
}: {
  fresh: LessonTerm[];
  existing: LessonTerm[];
  ticked: Set<string>;
  edits: Map<string, TermEdit>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (term: LessonTerm) => void;
  error: string | undefined;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const all = ticked.size === fresh.length;
  if (fresh.length === 0) {
    return (
      <View className="gap-5">
        <View className="gap-1">
          <Text className="text-md font-medium text-text">{t`Nothing new in this lesson`}</Text>
          <Text className="text-base text-text-2">
            {t`Every term worth a card is already in your decks.`}
          </Text>
        </View>
        <ExistingList terms={existing} />
      </View>
    );
  }
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3 px-1">
        <Text className="text-sm text-text-2" style={{ fontVariant: ["tabular-nums"] }}>
          {t`${ticked.size} of ${fresh.length} chosen`}
        </Text>
        <Press onPress={onToggleAll} accessibilityRole="button" hitSlop={10}>
          <Text className="text-sm font-medium text-text-2 underline">
            {all ? t`Clear all` : t`Select all`}
          </Text>
        </Press>
      </View>
      <Plate className="overflow-hidden">
        {fresh.map((term, i) => {
          const on = ticked.has(term.id);
          const edit = edits.get(term.id);
          const name = edit?.term ?? term.term;
          return (
            <Animated.View
              key={term.id}
              entering={rise(i)}
              className={`flex-row items-start ${i > 0 ? "border-t border-edge" : ""}`}
            >
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onToggle(term.id);
                }}
                accessibilityRole="checkbox"
                accessibilityLabel={name}
                accessibilityState={{ checked: on }}
                className="items-center justify-center py-3.5 ps-4 pe-2"
                hitSlop={{ top: 4, bottom: 4 }}
              >
                <View
                  className={`size-[22px] items-center justify-center rounded-md border-2 ${on ? "border-text bg-text" : "border-edge-2"}`}
                >
                  {on && <Icon name="check" size={14} colour={p.canvas} strokeWidth={3} />}
                </View>
              </Pressable>
              <Pressable
                onPress={() => onOpen(term)}
                testID="smart-add-term"
                accessibilityRole="button"
                accessibilityHint={t`Edit the term or its meaning`}
                className="flex-1 flex-row items-center gap-2 py-3 pe-3.5 ps-1"
                style={({ pressed }) => (pressed ? { backgroundColor: p.hover } : null)}
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-md font-medium text-text">{name}</Text>
                  <Text
                    className={`text-base ${edit?.meaning === null ? "text-muted" : "text-text-2"}`}
                  >
                    {edit?.meaning === undefined
                      ? term.gloss
                      : (edit.meaning ?? t`Lymi writes the meaning`)}
                  </Text>
                  <TermNote term={term} edited={edit !== undefined} />
                </View>
                <Icon name="edit" size={16} colour={p.faint} />
              </Pressable>
            </Animated.View>
          );
        })}
      </Plate>

      {existing.length > 0 && <ExistingList terms={existing} />}

      {error && (
        <View className="flex-row items-start gap-1.5 px-1" accessibilityLiveRegion="polite">
          <Icon name="alert" size={14} colour={p.danger} />
          <Text className="flex-1 text-base text-danger">{error}</Text>
        </View>
      )}
      <Text className="px-1 text-sm text-muted">
        {t`After you add them, Lymi writes each card’s example and pronunciation.`}
      </Text>
    </View>
  );
}

function TermNote({ term, edited }: { term: LessonTerm; edited: boolean }) {
  const { t } = useLingui();
  const note = edited
    ? t`Edited`
    : term.formOf
      ? t`Another form of ${term.formOf.term}, in ${term.formOf.deckName}`
      : term.keep !== null && !term.ticked
        ? t`Might not need its own card`
        : term.handwritten
          ? t`Handwritten`
          : null;
  return note ? <Text className="text-sm text-muted">{note}</Text> : null;
}

function ExistingList({ terms }: { terms: LessonTerm[] }) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <View className="gap-1 px-1">
      <Text className="pt-2 pb-1 text-sm text-muted" accessibilityRole="header">
        {t`Already in your decks`}
      </Text>
      {terms.map((term) => (
        <View key={term.id} className="flex-row items-start gap-3 py-1.5">
          <Icon name="check" size={16} colour={p.faint} />
          <View className="flex-1">
            <Text className="text-md text-muted">{term.term}</Text>
            <Text className="text-sm text-muted">{t`In ${term.existing?.deckName ?? ""}`}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
