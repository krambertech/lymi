import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { LessonQuestion, LessonTerm } from "@lymi/client/api";
import type { LessonAccessOut } from "@lymi/core";
import { isolate } from "@lymi/core";
import { PLATE_ARRIVE, PLATE_RISE } from "@lymi/design";
import * as Haptics from "expo-haptics";
import { type RefObject, useEffect, useState } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import Animated, { FadeOut, Keyframe } from "react-native-reanimated";
import { ALWAYS, timed, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { inputCap, MULTILINE } from "../theme/type";
import { Chip } from "../ui/chip";
import { FieldError } from "../ui/field";
import type { IconName } from "../ui/icons";
import { Icon, IconButton, Plate, Press, Text } from "../ui/primitives";
import { Radio } from "../ui/radio";
import { MAX_FILES, type Page, wordCount } from "./material";
import { RollingCount, ScanStage } from "./scan-stage";
import { Pulse, Swap } from "./swap";

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
      <Text className="text-md font-medium text-ink">{t`Smart add`}</Text>
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
  return (
    <View className="gap-5">
      {atLimit && daily ? (
        <LimitNotice daily={daily} />
      ) : (
        <Text className="px-1 text-base text-ink-secondary">
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
                  <Text className="text-md text-ink" numberOfLines={1}>
                    {name}
                  </Text>
                  <Text className="text-sm text-ink-muted">
                    {page.kind === "pdf" ? t`PDF` : t`Photo`}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  size="sm"
                  label={t`Remove ${{ name: isolate(name) }}`}
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
                <Text className="text-md text-ink" numberOfLines={1}>
                  {text.trim().slice(0, 160)}
                </Text>
                <Text className="text-sm text-ink-muted">
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
        {!empty && <Text className="px-1 text-sm font-medium text-ink-muted">{t`Add more`}</Text>}
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
                style={({ pressed }) => (pressed ? { backgroundColor: p["plate-hover"] } : null)}
              >
                <View
                  className={`size-10 items-center justify-center rounded-full bg-plate-nested ${off ? "opacity-45" : ""}`}
                >
                  <Icon name={source.icon} size={20} colour={p.ink} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-md font-medium"
                    style={{ color: off ? p["ink-muted"] : p.ink }}
                  >
                    {source.label}
                  </Text>
                  <Text className="text-sm text-ink-muted">
                    {!online ? t`Needs a connection` : source.hint}
                  </Text>
                </View>
                <Icon name="forward" size={18} colour={p["ink-faint"]} />
              </Pressable>
            );
          })}
        </Plate>
      </View>

      <FieldError>{error}</FieldError>
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
        <Text className="text-base text-ink-secondary">
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
    <View className="size-10 items-center justify-center rounded-md bg-plate-nested">
      <Icon name={icon} size={20} colour={p["ink-secondary"]} />
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
        placeholderTextColor={p["ink-muted"]}
        accessibilityLabel={t`Lesson text`}
        // The lesson is in the language being learned, which autocorrect gets wrong.
        autoCorrect={false}
        selectionColor={p.ink}
        className="rounded-xl border border-edge bg-plate px-4 font-sans text-md text-ink"
        // A tall box from the start, since a lesson runs to paragraphs. phone.md "Sheets".
        style={[MULTILINE, { minHeight: 256 }]}
        maxFontSizeMultiplier={inputCap(17)}
      />
      {words > 0 && (
        <Text className="px-1 text-sm text-ink-muted">
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
  const _reduce = useReduceMotion();
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
      <View className="w-full items-center">
        <RollingCount value={found} />
        <Text className="text-sm text-ink-muted">
          {t`${plural(found, { one: "term found", other: "terms found" })}`}
        </Text>
      </View>
      <View accessibilityLiveRegion="polite" className="w-full">
        <Swap id={stage} height={24}>
          <View className="flex-row items-center gap-2">
            <Pulse running={!finished} />
            <Text className="text-sm text-ink-secondary">{stage}</Text>
          </View>
        </Swap>
      </View>
      {/* The last term found, so the list is visibly filling while the pages are read. */}
      <View className="w-full" accessibilityElementsHidden>
        <Swap id={latest?.id ?? ""} height={32} distance={12}>
          {latest ? (
            <View className="flex-row items-center gap-2 rounded-full bg-plate-nested px-3 py-1">
              <Text className="text-sm font-medium text-ink" numberOfLines={1}>
                {latest.term}
              </Text>
              <Text className="shrink text-sm text-ink-muted" numberOfLines={1}>
                {latest.gloss}
              </Text>
            </View>
          ) : null}
        </Swap>
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
      {questions.map((question, index) => {
        const chosen = answers[index] ?? question.default;
        return (
          <View key={question.id} className="gap-2.5">
            <Text className="px-1 text-md font-medium text-ink">{question.question}</Text>
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
                  style={({ pressed }) => (pressed ? { backgroundColor: p["plate-hover"] } : null)}
                >
                  <Text className="flex-1 text-md text-ink">{option.label}</Text>
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
                  placeholderTextColor={p["ink-muted"]}
                  accessibilityLabel={t`Something else`}
                  maxLength={300}
                  returnKeyType="done"
                  selectionColor={p.ink}
                  className="min-h-[52px] flex-1 py-3 font-sans text-md text-ink"
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
        <View className="gap-1 px-1">
          <Text className="text-md font-medium text-ink">{t`Nothing new in this lesson`}</Text>
          <Text className="text-base text-ink-secondary">
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
        <Text className="text-sm text-ink-secondary" style={{ fontVariant: ["tabular-nums"] }}>
          {t`${ticked.size} of ${fresh.length} chosen`}
        </Text>
        <Press
          onPress={onToggleAll}
          accessibilityRole="button"
          className="min-h-11 justify-center"
          hitSlop={{ left: 10, right: 10 }}
        >
          <Text className="text-sm font-medium text-ink-secondary underline">
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
              className={i > 0 ? "border-t border-edge" : ""}
            >
              {/* A tap ticks, a hold edits; VoiceOver offers editing as an action, since a hold is never found by ear. */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onToggle(term.id);
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onOpen(term);
                }}
                delayLongPress={350}
                testID="smart-add-term"
                accessibilityRole="checkbox"
                accessibilityLabel={name}
                accessibilityState={{ checked: on }}
                accessibilityActions={[{ name: "edit", label: t`Edit term` }]}
                onAccessibilityAction={(e) => e.nativeEvent.actionName === "edit" && onOpen(term)}
                className="flex-row items-start gap-3 py-3 ps-4 pe-3.5"
                style={({ pressed }) => (pressed ? { backgroundColor: p["plate-hover"] } : null)}
              >
                {/* A rounded square, as the deck page's SelectBox, so several-of reads apart from a radio. */}
                <View
                  className={`mt-0.5 size-[22px] items-center justify-center border-2 ${on ? "border-ink bg-ink" : "border-edge-strong"}`}
                  style={{ borderRadius: 6 }}
                >
                  {on && <Icon name="check" size={14} colour={p.canvas} strokeWidth={3} />}
                </View>
                <View className="flex-1 gap-0.5">
                  {/* Edited sits at the term's end, so marking an edit adds no line. */}
                  <View className="flex-row items-baseline gap-2">
                    <Text className="flex-1 text-md font-medium text-ink">{name}</Text>
                    {edit !== undefined && (
                      <Text className="text-sm text-ink-muted">{t`Edited`}</Text>
                    )}
                  </View>
                  <Text
                    className={`text-base ${edit?.meaning === null ? "text-ink-muted" : "text-ink-secondary"}`}
                  >
                    {edit?.meaning === undefined
                      ? term.gloss
                      : (edit.meaning ?? t`Lymi writes the meaning`)}
                  </Text>
                  <TermNote term={term} />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </Plate>

      {existing.length > 0 && <ExistingList terms={existing} />}

      <FieldError>{error}</FieldError>
    </View>
  );
}

function TermNote({ term }: { term: LessonTerm }) {
  const { t } = useLingui();
  const note = term.formOf
    ? t`Another form of ${isolate(term.formOf.term)}, in ${isolate(term.formOf.deckName)}`
    : term.keep !== null && !term.ticked
      ? t`May belong on another card`
      : term.handwritten
        ? t`Handwritten`
        : null;
  return note ? <Text className="text-sm text-ink-muted">{note}</Text> : null;
}

function ExistingList({ terms }: { terms: LessonTerm[] }) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <View className="gap-1 px-1">
      <Text className="pt-2 pb-1 text-sm text-ink-muted" accessibilityRole="header">
        {t`Already in your decks`}
      </Text>
      {terms.map((term) => (
        <View key={term.id} className="flex-row items-start gap-3 py-1.5">
          <Icon name="check" size={16} colour={p["ink-faint"]} />
          <View className="flex-1">
            <Text className="text-md text-ink-muted">{term.term}</Text>
            <Text className="text-sm text-ink-muted">{t`In ${isolate(term.existing?.deckName ?? "")}`}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
