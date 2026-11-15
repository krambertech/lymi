import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { DeckSummary } from "@lymi/client/api";
import { GOAL_MINUTES, LANGUAGE_PILLS, type Own } from "@lymi/client/welcome";
import {
  DAILY_GOAL_PRESETS,
  isolate,
  LANGUAGE_TAGS,
  type LearningKind,
  STARTING_DAILY_GOAL,
} from "@lymi/core";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, Keyframe } from "react-native-reanimated";
import { Lantern } from "../brand/lantern";
import { englishLanguageName, languageName } from "../data/languages";
import { DeckTray } from "../explore/tray";
import { GOAL_NAMES } from "../streak/goal-picker";
import { useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Chip } from "../ui/chip";
import { Input } from "../ui/field";
import type { IconName } from "../ui/icons";
import { Icon, Plate, Press, Text } from "../ui/primitives";
import { ChoiceTile, HowItWorks, Tick } from "./parts";

export type WelcomeStart = { kind: "deck"; deck: PublicDeckSummary } | { kind: "own"; own: Own };

/** A deck an invitation or a public page added while signing up. */
type JoinedDeck = Pick<DeckSummary, "name" | "defaultLanguage" | "total" | "owner" | "published">;

/** A new question slides in from the direction of travel out of a short fade. onboarding.md "Motion". */
export function Arrive({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const entering = reduce
    ? FadeIn.duration(150)
    : new Keyframe({
        0: { opacity: 0, transform: [{ translateX: 28 }] },
        100: { opacity: 1, transform: [{ translateX: 0 }], easing: Easing.out(Easing.cubic) },
      }).duration(260);
  return (
    <Animated.View entering={entering} style={{ flexGrow: 1 }}>
      {children}
    </Animated.View>
  );
}

export function QuestionHeading({ title, lede }: { title: string; lede?: string }) {
  return (
    <View className="gap-2 pb-5">
      <Text
        className="text-2xl font-medium text-ink"
        style={{ letterSpacing: -0.4 }}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {lede && <Text className="text-md text-ink-secondary">{lede}</Text>}
    </View>
  );
}

/**
 * The first screen for every new account: the lantern lights the room, then what comes next, and
 * one plate to anchor it: the deck the learner arrived with, or else how review works.
 */
export function Hello({ joined }: { joined: JoinedDeck | undefined }) {
  const { t } = useLingui();
  return (
    <View className="flex-1 items-center justify-center gap-6 pb-4">
      <Lantern size={120} />
      <View className="items-center gap-2">
        <Text
          className="text-center text-3xl font-medium text-ink"
          style={{ letterSpacing: -0.6 }}
          accessibilityRole="header"
        >
          {t`Welcome to Lymi`}
        </Text>
        <Text className="text-center text-md text-ink-secondary">
          {joined
            ? t`Your deck is ready. Choose your daily goal, then review your first cards.`
            : t`A few quick questions, then your first review.`}
        </Text>
      </View>
      <View className="self-stretch">
        {joined ? <JoinedPlate deck={joined} /> : <HowItWorks />}
      </View>
    </View>
  );
}

/** Whose deck it is and what is in it, in the join page's words. */
function JoinedPlate({ deck }: { deck: JoinedDeck }) {
  const { t } = useLingui();
  const p = usePalette();
  const owner = deck.owner.name;
  return (
    <Plate className="gap-3 p-5">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-base text-ink-secondary" numberOfLines={1}>
          {deck.published
            ? t`From ${{ owner: isolate(owner) }}`
            : t`${{ owner: isolate(owner) }} shared a deck`}
        </Text>
        <Chip icon="check">{t`In Library`}</Chip>
      </View>
      <Text className="text-xl font-medium text-ink" accessibilityRole="header">
        {deck.name}
      </Text>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {deck.defaultLanguage && (
          <View className="flex-row items-center gap-1.5">
            <Icon name="language" size={16} colour={p["ink-muted"]} />
            <Text className="text-base text-ink-muted">{languageName(deck.defaultLanguage)}</Text>
          </View>
        )}
        <View className="flex-row items-center gap-1.5">
          <Icon name="series" size={16} colour={p["ink-muted"]} />
          <Text className="text-base text-ink-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {plural(deck.total, { one: "# card", other: "# cards" })}
          </Text>
        </View>
      </View>
    </Plate>
  );
}

export function KindChoices({
  value,
  onChange,
}: {
  value: LearningKind | null;
  onChange: (kind: LearningKind) => void;
}) {
  const { t } = useLingui();
  const kinds: { value: LearningKind; icon: IconName; title: string; detail: string }[] = [
    {
      value: "language",
      icon: "language",
      title: t`A language`,
      detail: t`Words and phrases in a language you’re learning.`,
    },
    {
      value: "test",
      icon: "reviewedDays",
      title: t`For a test`,
      detail: t`A citizenship test, a driving test or another exam.`,
    },
    {
      value: "subject",
      icon: "explore",
      title: t`A subject`,
      detail: t`Countries, stars, birds or anything else with names.`,
    },
    {
      value: "other",
      icon: "idea",
      title: t`Something else`,
      detail: t`Anything else you want to remember.`,
    },
  ];
  return (
    <View
      className="gap-3"
      accessibilityRole="radiogroup"
      accessibilityLabel={t`What you’re learning`}
    >
      {kinds.map((k) => (
        <ChoiceTile
          key={k.value}
          icon={k.icon}
          title={k.title}
          detail={k.detail}
          chosen={value === k.value}
          onPress={() => onChange(k.value)}
        />
      ))}
    </View>
  );
}

function Pill({
  label,
  chosen,
  onPress,
  icon,
}: {
  label: string;
  chosen: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      scale={0.96}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      className={`h-11 flex-row items-center gap-1.5 rounded-full px-4 ${chosen ? "bg-ink" : "border border-edge bg-plate"}`}
    >
      {icon && <Icon name={icon} size={16} colour={chosen ? p.canvas : p["ink-secondary"]} />}
      <Text className="text-md font-medium" style={{ color: chosen ? p.canvas : p.ink }}>
        {label}
      </Text>
    </Press>
  );
}

const nameOf = (tag: string) =>
  (LANGUAGE_TAGS as readonly string[]).includes(tag) ? languageName(tag) : tag;

/**
 * The languages with the most published decks as pills. Another language opens a field and the rest
 * of Explore's languages, narrowed as the learner types; a language Lymi does not list is kept as typed.
 */
export function LanguageChoices({
  languages,
  value,
  onChange,
}: {
  languages: string[];
  value: string | null;
  onChange: (tag: string) => void;
}) {
  const { t } = useLingui();
  const pills = languages.slice(0, LANGUAGE_PILLS);
  const listed = new Set<string>(LANGUAGE_TAGS);
  const rest = [
    ...languages.slice(LANGUAGE_PILLS),
    ...LANGUAGE_TAGS.filter((tag) => !languages.includes(tag)),
  ];
  const [other, setOther] = useState(!!value && !pills.includes(value));
  const [query, setQuery] = useState(value && !listed.has(value) ? value : "");
  const asked = query.trim().toLocaleLowerCase();
  const matches = rest.filter((tag) => {
    if (!asked) return true;
    return (
      nameOf(tag).toLocaleLowerCase().includes(asked) ||
      englishLanguageName(tag).toLocaleLowerCase().includes(asked)
    );
  });
  const typed = query.trim();
  const exact = matches.some((tag) => nameOf(tag).toLocaleLowerCase() === asked);
  return (
    <View className="gap-5">
      <View
        className="flex-row flex-wrap gap-2"
        accessibilityRole="radiogroup"
        accessibilityLabel={t`Language`}
      >
        {pills.map((tag) => (
          <Pill
            key={tag}
            label={nameOf(tag)}
            chosen={value === tag}
            onPress={() => {
              setOther(false);
              onChange(tag);
            }}
          />
        ))}
        <Pill
          label={t`Another language`}
          icon="search"
          chosen={other}
          onPress={() => setOther(true)}
        />
      </View>
      {other && (
        <Animated.View entering={FadeIn.duration(200)} className="gap-3">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t`Search or type a language`}
            autoFocus
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (typed) onChange(matches.length === 1 && matches[0] ? matches[0] : typed);
            }}
          />
          <View className="flex-row flex-wrap gap-2">
            {matches.slice(0, 24).map((tag) => (
              <Pill
                key={tag}
                label={nameOf(tag)}
                chosen={value === tag}
                onPress={() => onChange(tag)}
              />
            ))}
            {typed && !exact && (
              <Pill
                label={t`Learning “${{ typed: isolate(typed) }}”`}
                icon="plus"
                chosen={value === typed}
                onPress={() => onChange(typed)}
              />
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export function GoalChoices({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t, i18n } = useLingui();
  return (
    <View className="gap-3" accessibilityRole="radiogroup" accessibilityLabel={t`Daily goal`}>
      {DAILY_GOAL_PRESETS.map((n) => {
        const minutes = plural(GOAL_MINUTES[n], { one: "# minute", other: "# minutes" });
        const reviews = plural(n, { one: "# review", other: "# reviews" });
        return (
          <ChoiceTile
            key={n}
            title={i18n._(GOAL_NAMES[n])}
            aside={
              n === STARTING_DAILY_GOAL ? <Chip size="sm">{t`Good to start`}</Chip> : undefined
            }
            detail={t`About ${minutes}, ${reviews}`}
            chosen={value === n}
            onPress={() => onChange(n)}
          />
        );
      })}
    </View>
  );
}

/** Ready-made decks and the ways to bring one's own, with equal weight; whichever matched leads. */
export function StartChoices({
  decks,
  loading,
  ownFirst,
  language,
  value,
  onChange,
}: {
  decks: PublicDeckSummary[];
  loading: boolean;
  ownFirst: boolean;
  /** The chosen language, when its shelf matched, to name the decks after. */
  language: string | null;
  value: WelcomeStart | null;
  onChange: (start: WelcomeStart) => void;
}) {
  const { t } = useLingui();
  const { width } = useWindowDimensions();
  const tile = (width - 40 - 12) / 2;
  const deckSection = (
    <View className="gap-3">
      <Text className="text-lg font-medium text-ink" accessibilityRole="header">
        {language ? t`Ready-made decks in ${nameOf(language)}` : t`Ready-made decks`}
      </Text>
      {decks.length > 0 ? (
        <View className="flex-row flex-wrap gap-3" accessibilityRole="radiogroup">
          {decks.map((deck) => (
            <DeckChoice
              key={deck.slug}
              deck={deck}
              width={tile}
              chosen={value?.kind === "deck" && value.deck.slug === deck.slug}
              onPress={() => onChange({ kind: "deck", deck })}
            />
          ))}
        </View>
      ) : (
        <Text className="text-base text-ink-muted">
          {loading ? t`Loading decks…` : t`No ready-made decks yet.`}
        </Text>
      )}
    </View>
  );
  const own: { value: Own; icon: IconName; title: string; detail: string; web: boolean }[] = [
    {
      value: "lesson",
      icon: "camera",
      title: t`Turn your notes into cards`,
      detail: t`Photograph a lesson or paste your notes, then choose the terms to keep.`,
      web: false,
    },
    {
      value: "import",
      icon: "import",
      title: t`Import decks`,
      detail: t`From Anki, Mochi or Noji, with their review history.`,
      web: true,
    },
    {
      value: "assistant",
      icon: "ai",
      title: t`Send a lesson from Claude or ChatGPT`,
      detail: t`Connect it once, then send your notes as cards.`,
      web: true,
    },
    {
      value: "type",
      icon: "manual",
      title: t`Type your own cards`,
      detail: t`Make a deck and add cards from your last lesson.`,
      web: false,
    },
  ];
  const ownSection = (
    <View className="gap-3">
      <Text className="text-lg font-medium text-ink" accessibilityRole="header">
        {t`Bring your own`}
      </Text>
      <View className="gap-3" accessibilityRole="radiogroup">
        {own.map((o) => (
          <ChoiceTile
            key={o.value}
            icon={o.icon}
            title={o.title}
            detail={o.web ? t`${o.detail} Opens on the web.` : o.detail}
            chosen={value?.kind === "own" && value.own === o.value}
            onPress={() => onChange({ kind: "own", own: o.value })}
          />
        ))}
      </View>
    </View>
  );
  return (
    <View className="gap-6">
      {ownFirst ? ownSection : deckSection}
      {ownFirst ? deckSection : ownSection}
    </View>
  );
}

function DeckChoice({
  deck,
  width,
  chosen,
  onPress,
}: {
  deck: PublicDeckSummary;
  width: number;
  chosen: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  const cards = plural(deck.cardCount, { one: "# card", other: "# cards" });
  return (
    <Press
      onPress={onPress}
      scale={0.97}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={`${deck.name}, ${cards}`}
      style={{ width }}
    >
      <Plate
        className="overflow-hidden"
        style={chosen ? { borderColor: p.ink, borderWidth: 1.5 } : undefined}
      >
        <DeckTray deck={deck} cw={width * 0.62} flush />
        <View className="gap-0.5 p-4">
          <Text className="text-md font-medium text-ink" numberOfLines={2}>
            {deck.name}
          </Text>
          <Text className="text-sm text-ink-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {cards}
          </Text>
        </View>
        {chosen && (
          <View className="absolute end-2.5 top-2.5">
            <Tick />
          </View>
        )}
      </Plate>
    </Press>
  );
}
