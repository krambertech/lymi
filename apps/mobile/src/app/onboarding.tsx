import { useLingui } from "@lingui/react/macro";
import { aiChoice, saveAiChoice } from "@lymi/client/ai-consent";
import { api, errorMessage, type Settings } from "@lymi/client/api";
import { decksQuery, exploreQuery, settingsQuery } from "@lymi/client/queries";
import { catalogLanguages, startDecks } from "@lymi/client/welcome";
import { writes } from "@lymi/client/writes";
import {
  DeckInput,
  type DeckPurpose,
  LANGUAGE_TAGS,
  type LearningKind,
  type OnboardingInput,
  STARTING_DAILY_GOAL,
} from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pool } from "../auth/door-parts";
import { languageName } from "../data/languages";
import { useAddDeck, useAddFailure } from "../explore/catalogue";
import { AiServices, ConsentButtons } from "../privacy/ai-consent";
import { captureEvent } from "../telemetry/posthog";
import { Button, Text } from "../ui/primitives";
import { BarButton, BarText } from "../ui/screen";
import { useSystemBack } from "../ui/system-back";
import { CONNECT_DOCS } from "../welcome/assistant-offer";
import { setAfterWelcome, useWelcomeDeck, welcomeWith } from "../welcome/gate";
import {
  Arrive,
  GoalChoices,
  Hello,
  KindChoices,
  LanguageChoices,
  QuestionHeading,
  StartChoices,
  type WelcomeStart,
} from "../welcome/questions";
import { endWelcome, finishStep, trackGuide, viewStep } from "../welcome/tracking";

type Step = "hello" | "kind" | "language" | "goal" | "ai" | "start";

const SKIP: OnboardingInput = { learningKind: null, learningLanguage: null, dailyGoal: null };

/**
 * Welcome: what the learner is learning, a daily goal and a way to start, one full-screen question at
 * a time, then the first review. A learner who arrived with a deck is asked only the goal. The root
 * shows it once, in place of Today, to an account with nothing in it (`welcome/gate.ts`), and
 * finishing or skipping saves `onboarded_at`, which holds on both apps and brings Today back.
 * docs/design/onboarding.md.
 */
export default function Onboarding() {
  const { t } = useLingui();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const deckId = useWelcomeDeck();
  const settings = useQuery(settingsQuery);
  const explore = useQuery(exploreQuery);
  const decks = useQuery({ ...decksQuery, enabled: !!deckId });
  const joined = deckId ? decks.data?.find((d) => d.id === deckId) : undefined;
  const shortcut = !!joined;
  const [trail, setTrail] = useState<Step[]>(["hello"]);
  const [kind, setKind] = useState<LearningKind | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [goal, setGoal] = useState<number>(STARTING_DAILY_GOAL);
  const [start, setStart] = useState<WelcomeStart | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const step = trail.at(-1) ?? "hello";
  const aiChoiceNow = aiChoice(settings.data);
  const [allowing, setAllowing] = useState(false);

  useEffect(() => viewStep(step), [step]);
  useEffect(() => {
    if (step === "ai") captureEvent("ai_consent_shown", { place: "welcome" });
  }, [step]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the step is the trigger.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const catalog = explore.data?.decks.filter((d) => !explore.data.added[d.slug]);
  const meaningLanguage = settings.data?.meaningLanguage ?? "en";
  const languages = catalogLanguages(catalog ?? [], meaningLanguage);
  const { decks: offered, ownFirst } = startDecks(catalog ?? [], kind, language);

  const save = useMutation({
    mutationFn: api.finishOnboarding,
    onSuccess: (value: Settings) => qc.setQueryData(settingsQuery.queryKey, value),
  });
  const add = useAddDeck(() => {});
  const addFailure = useAddFailure();
  const busy = save.isPending || add.isPending;

  const move = (to: Step | null) => {
    setMissing(null);
    setError(null);
    if (to === null) return setTrail((s) => (s.length > 1 ? s.slice(0, -1) : s));
    finishStep(step, false);
    setTrail((s) => [...s, to]);
  };
  // Android's Back steps back through the questions, as the bar's back does, and never past Welcome.
  useSystemBack(() => {
    if (trail.length < 2) return false;
    move(null);
    return true;
  });

  // Saving `onboarded_at` is what ends Welcome: the root brings Today back, and Today opens `then`.
  const saveAndLeave = async (input: OnboardingInput, then?: Href) => {
    setAfterWelcome(then ?? null);
    try {
      await save.mutateAsync(input);
    } catch (e) {
      setAfterWelcome(null);
      throw e;
    }
    welcomeWith(null);
  };

  /** The deck a lesson start made, so a retry after a failed save reuses it rather than making another. */
  const lessonDeckRef = useRef<string | null>(null);
  /** The learner's first deck, named for what they learn, for Smart add to write to. */
  const firstDeck = async (learning: LearningKind) => {
    if (lessonDeckRef.current) return lessonDeckRef.current;
    const purpose: DeckPurpose =
      learning === "language" ? "language" : learning === "other" ? "other" : "subject";
    // A language Lymi does not list is kept as it was typed, so it names the deck but sets nothing.
    const tag = (LANGUAGE_TAGS as readonly string[]).includes(language ?? "") ? language : null;
    const name =
      learning === "language" && language ? (tag ? languageName(tag) : language) : t`My notes`;
    const { id } = await writes.createDeck(
      DeckInput.parse({ name, purpose, defaultLanguage: learning === "language" ? tag : null }),
    );
    void qc.invalidateQueries({ queryKey: ["decks"] });
    lessonDeckRef.current = id;
    return id;
  };

  const finish = async (answers: WelcomeStart) => {
    if (!kind) return;
    setError(null);
    let saving = false;
    let lessonDeck: string | undefined;
    try {
      // Smart add writes to a deck, so a lesson first makes one from the answers.
      if (answers.kind === "own" && answers.own === "lesson") {
        try {
          lessonDeck = await firstDeck(kind);
        } catch (e) {
          setError(errorMessage(e));
          return;
        }
      }
      if (answers.kind === "deck") {
        await add.mutateAsync({
          slug: answers.deck.slug,
          edition: answers.deck.meaningLanguage,
        });
      }
      saving = true;
      await saveAndLeave(
        {
          learningKind: kind,
          learningLanguage: kind === "language" ? language : null,
          dailyGoal: goal,
        },
        answers.kind === "deck"
          ? "/review"
          : answers.own === "type"
            ? "/new-deck"
            : lessonDeck
              ? (`/smart-add?deck=${lessonDeck}` as Href)
              : answers.own === "import"
                ? "/import"
                : undefined,
      );
    } catch (e) {
      setError(
        saving
          ? t`Couldn’t save your answers. Check your connection and try again.`
          : addFailure(e),
      );
      return;
    }
    // Counted once saved; the events outlive this screen, which saving has just closed.
    trackGuide(
      answers.kind === "deck"
        ? "explore"
        : answers.own === "lesson"
          ? "lesson"
          : answers.own === "assistant"
            ? "ai_mcp"
            : answers.own === "type"
              ? "typed"
              : "import",
    );
    finishStep("start", false);
    endWelcome();
    // The assistant's guide is on the web, over Today with its guide.
    if (answers.kind === "own" && answers.own === "assistant") void openBrowserAsync(CONNECT_DOCS);
  };

  const startJoined = async () => {
    if (!joined) return;
    setError(null);
    try {
      // A deck shared before its owner added a card has nothing to review yet, so its page says so.
      await saveAndLeave(
        { ...SKIP, dailyGoal: goal },
        (joined.total === 0 ? `/library/${joined.id}` : `/review?deck=${joined.id}`) as Href,
      );
    } catch {
      setError(t`Couldn’t save your daily goal. Check your connection and try again.`);
      return;
    }
    finishStep("goal", false);
    endWelcome();
  };

  // Not now leaves the choice unanswered, so the first AI action asks again.
  const allowAi = async () => {
    setError(null);
    setAllowing(true);
    try {
      await saveAiChoice(qc, true, "welcome");
      move("start");
    } catch {
      setError(t`Couldn’t save. Check your connection and try again.`);
    } finally {
      setAllowing(false);
    }
  };

  const skip = async () => {
    setError(null);
    try {
      // Their deck's page, not Today's guide, which is about making a deck of their own.
      await saveAndLeave(SKIP, joined ? (`/library/${joined.id}` as Href) : undefined);
    } catch {
      setError(t`Couldn’t skip for now. Check your connection and try again.`);
      return;
    }
    finishStep(step, true);
    endWelcome();
  };

  const next = () => {
    if (step === "hello") return move(shortcut ? "goal" : "kind");
    if (step === "kind") {
      if (!kind) return setMissing(t`Choose one to continue.`);
      return move(kind === "language" ? "language" : "goal");
    }
    if (step === "language") {
      if (!language) return setMissing(t`Choose the language you’re learning.`);
      return move("goal");
    }
    if (step === "goal")
      return shortcut ? void startJoined() : move(aiChoiceNow === true ? "start" : "ai");
    if (!start) return setMissing(t`Choose a deck or a way to bring your own.`);
    void finish(start);
  };

  // The questions wait for the deck the learner arrived with; one no longer in Library gets them all.
  if (deckId && !joined && decks.isPending) return <View className="flex-1 bg-canvas" />;

  const label =
    step === "start"
      ? !start
        ? t`Continue`
        : start.kind === "deck"
          ? t`Add and review`
          : start.own === "lesson"
            ? t`Add a lesson`
            : start.own === "import"
              ? t`Go to import`
              : start.own === "assistant"
                ? t`Connect an app`
                : t`New deck`
      : shortcut && step === "goal"
        ? t`Start review`
        : t`Continue`;

  return (
    <View className="flex-1 bg-canvas">
      {step === "hello" && <Pool className="-inset-x-10 -top-40 h-[70%]" />}
      <View style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center px-4">
          {trail.length > 1 && <BarButton icon="back" label={t`Back`} onPress={() => move(null)} />}
          <View className="flex-1" />
          <BarText label={t`Skip for now`} onPress={() => void (busy ? null : skip())} />
        </View>
      </View>
      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-6"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Arrive key={step}>
          {step === "hello" && <Hello joined={joined} />}
          {step === "kind" && (
            <>
              <QuestionHeading
                title={t`What are you learning?`}
                lede={t`Lymi works for anything you want to remember.`}
              />
              <KindChoices
                value={kind}
                onChange={(k) => {
                  setKind(k);
                  setStart(null);
                  setMissing(null);
                }}
              />
            </>
          )}
          {step === "language" && (
            <>
              <QuestionHeading
                title={t`Which language?`}
                lede={t`We’ll show ready-made decks in it. You can add more languages later.`}
              />
              <LanguageChoices
                languages={languages}
                value={language}
                onChange={(tag) => {
                  setLanguage(tag);
                  setStart(null);
                  setMissing(null);
                }}
              />
            </>
          )}
          {step === "goal" && (
            <>
              <QuestionHeading
                title={t`How much time a day?`}
                lede={t`Little and often works best. Meeting your daily goal keeps your streak going. You can change it any time.`}
              />
              <GoalChoices value={goal} onChange={setGoal} />
            </>
          )}
          {step === "ai" && (
            <View className="gap-5">
              <QuestionHeading
                title={t`Let AI do the typing`}
                lede={t`Add a word and AI writes its meaning, an example and how it sounds. Before it does, Lymi needs your permission to send these to AI services.`}
              />
              <AiServices />
            </View>
          )}
          {step === "start" && (
            <>
              <QuestionHeading
                title={t`How do you want to start?`}
                lede={
                  ownFirst
                    ? t`Bring what you’re learning, or start with a ready-made deck.`
                    : t`Pick a ready-made deck, or bring what you already have.`
                }
              />
              <StartChoices
                decks={offered}
                loading={!explore.data}
                ownFirst={ownFirst}
                language={kind === "language" && !ownFirst ? language : null}
                value={start}
                onChange={(s) => {
                  setStart(s);
                  setMissing(null);
                }}
              />
            </>
          )}
        </Arrive>
      </ScrollView>
      <View className="gap-3 px-5 pt-3" style={{ paddingBottom: insets.bottom + 8 }}>
        {(missing || error) && (
          <Text className="text-base text-danger" accessibilityRole="alert">
            {missing ?? error}
          </Text>
        )}
        {step === "ai" ? (
          <ConsentButtons
            busy={allowing}
            onAllow={() => void allowAi()}
            onLater={() => move("start")}
          >
            {t`You can change this any time in You.`}
          </ConsentButtons>
        ) : (
          <Button label={label} variant="primary" size="lg" loading={busy} onPress={next} />
        )}
      </View>
    </View>
  );
}
