import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  api,
  errorMessage,
  type LessonQuestion,
  type LessonTerm,
  refusalCode,
} from "@lymi/client/api";
import { isolate } from "@lymi/core";
import { PLATE_ARRIVE } from "@lymi/design";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, type TextInput, View } from "react-native";
import Animated, { FadeOut, Keyframe } from "react-native-reanimated";
import { CAPTURE_KEYS, captureStore } from "../data/kept";
import { useOwnedDecks } from "../data/queries";
import { useAiConsent } from "../privacy/ai-consent";
import {
  canScan,
  chooseFiles,
  choosePhotos,
  discard,
  lessonForm,
  MAX_FILES,
  type Page,
  type Picked,
  scan,
  wordCount,
} from "../smart-add/material";
import {
  InputStep,
  ListStep,
  OWN_ANSWER,
  QuestionsStep,
  ReadingStep,
  SmartAddTitle,
  type TermEdit,
  WritingStep,
} from "../smart-add/steps";
import { TermSheet } from "../smart-add/term-sheet";
import { useOnline } from "../streak/goal-picker";
import { ALWAYS, CROSSFADE, timed, useReduceMotion } from "../theme/motion";
import { FormHeader } from "../ui/form-header";
import { GlassPill } from "../ui/glass";
import { Select } from "../ui/menu";
import { toast } from "../ui/toast-host";

type Step = "input" | "writing" | "reading" | "questions" | "list";

const LESSON_ACCESS = ["lesson-reads", "access"];
/** Past the Worker's own 120 s limit on the model, so only a read the server has dropped stops. */
const QUIET_MS = 130_000;

const { duration, easing } = timed(PLATE_ARRIVE);
/** Each step rises into place as the last one fades, as the web's do. */
const ARRIVE = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 6 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing },
})
  .duration(duration + 20)
  .reduceMotion(ALWAYS);
const LEAVE = FadeOut.duration(120).reduceMotion(ALWAYS);

/**
 * Smart add: a lesson's pages, files or text in, read while its terms stream in, a pick list out.
 * A long form, since the list scrolls and the text runs long. phone.md "Smart add".
 */
export default function SmartAdd() {
  const { t } = useLingui();
  const router = useRouter();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const reduce = useReduceMotion();
  const online = useOnline();
  const { deck: fixedDeck } = useLocalSearchParams<{ deck?: string }>();
  const decks = useOwnedDecks().data ?? [];
  const [step, setStep] = useState<Step>("input");
  const [pages, setPages] = useState<Page[]>([]);
  const [text, setText] = useState("");
  const [deckId, setDeckId] = useState(fixedDeck);
  const deck = decks.find((d) => d.id === deckId);
  const [error, setError] = useState<string>();
  const [terms, setTerms] = useState<LessonTerm[]>([]);
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [ownAnswers, setOwnAnswers] = useState<string[]>([]);
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const [edits, setEdits] = useState<Map<string, TermEdit>>(() => new Map());
  const [editing, setEditing] = useState<LessonTerm | null>(null);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const stop = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollView>(null);
  const textRef = useRef<TextInput>(null);
  const consent = useAiConsent("smart_add");
  // Read fresh each time Smart add opens: the web or another read may have used today's lessons.
  const access = useQuery({
    queryKey: LESSON_ACCESS,
    queryFn: api.lessonAccess,
    refetchOnMount: "always",
  });
  const daily = access.data?.daily ?? null;
  const atLimit = daily !== null && daily.used >= daily.limit;
  const fresh = useMemo(() => terms.filter((term) => !term.existing), [terms]);
  const existing = useMemo(() => terms.filter((term) => term.existing), [terms]);
  const words = wordCount(text);
  const empty = pages.length === 0 && words === 0;
  /** What was read last, so going back and forward with the same lesson keeps its list. */
  const material = `${pages.map((page) => page.id).join()}|${text.trim()}`;
  const readOf = useRef<string | null>(null);

  useEffect(() => () => stop.current?.abort(), []);
  // The pages are read, not kept: their files leave the cache with the screen.
  const kept = useRef(pages);
  kept.current = pages;
  useEffect(
    () => () => {
      for (const page of kept.current) discard(page.uri);
    },
    [],
  );
  // The deck the server names must be on the list, though the web may have changed the decks since.
  useEffect(() => void qc.invalidateQueries({ queryKey: ["decks"] }), [qc]);
  // A new step starts at its top.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on each step
  useEffect(() => scroll.current?.scrollTo({ y: 0, animated: false }), [step]);

  // A swipe down asks before it throws the lesson away, as a form with something typed does.
  usePreventRemove(!empty && !added, ({ data }) => {
    Alert.alert(t`Discard this lesson?`, t`The pages and text you added aren’t kept.`, [
      { text: t`Keep adding`, style: "cancel" },
      {
        text: t`Discard`,
        style: "destructive",
        onPress: () => {
          stop.current?.abort();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const take = async (pick: (room: number) => Promise<Picked>) => {
    const room = MAX_FILES - pages.length;
    try {
      const picked = await pick(room);
      setError(
        picked.over
          ? t`Up to ${MAX_FILES} files at a time. The first ${room} were added.`
          : undefined,
      );
      if (picked.pages.length) setPages((all) => [...all, ...picked.pages]);
      if (picked.text)
        setText((all) => (all.trim() ? `${all.trim()}\n\n${picked.text}` : picked.text));
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const sources = [
    // Every supported iPhone has the document camera; without one there is no camera to offer,
    // and iOS's plain camera picker throws rather than refusing.
    ...(canScan()
      ? [
          {
            id: "scan",
            icon: "camera" as const,
            label: t`Scan pages`,
            hint: t`Several pages at once`,
            onPress: () => void take(scan),
          },
        ]
      : []),
    {
      id: "photos",
      icon: "picture" as const,
      label: t`Photos`,
      hint: t`Pictures of the pages`,
      onPress: () => void take(choosePhotos),
    },
    {
      id: "files",
      icon: "fileIn" as const,
      label: t`Files`,
      hint: t`A PDF, or a text file such as a transcript`,
      onPress: () => void take(chooseFiles),
    },
    {
      id: "text",
      icon: "example" as const,
      label: t`Text`,
      hint: t`Paste notes or a transcript`,
      onPress: () => setStep("writing"),
    },
  ];

  const start = async () => {
    if (decks.length === 0 && !fixedDeck) {
      setError(t`Create a deck first, then add a lesson to it.`);
      return;
    }
    if (empty) return;
    // Unchanged material goes back to its list, so looking at the lesson again costs no read.
    if (finished && readOf.current === material) {
      setStep(questions.length > 0 ? "questions" : "list");
      return;
    }
    if (atLimit) return;
    // The pages leave the phone only once the learner has allowed it.
    if (!consent.allowed && !(await consent.ask())) {
      setError(t`Smart add reads your lesson with AI. Allow it to find the terms.`);
      return;
    }
    setError(undefined);
    setTerms([]);
    setQuestions([]);
    setEdits(new Map());
    setFinished(false);
    readOf.current = material;
    setStep("reading");
    const controller = new AbortController();
    stop.current = controller;
    const last = captureStore.getString(CAPTURE_KEYS.smartAddDeck);
    const hint = decks.some((d) => d.id === last) ? last : undefined;
    let asked: LessonQuestion[] = [];
    let found: LessonTerm[] = [];
    // A read that goes quiet is stopped, so the scan never runs on with nothing coming.
    let quiet = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        quiet = true;
        controller.abort();
      }, QUIET_MS);
    };
    wake();
    try {
      await api.readLesson(
        lessonForm(pages, text, fixedDeck, hint),
        (event) => {
          wake();
          if (event.type === "deck") {
            setDeckId(event.deckId);
            if (!decks.some((d) => d.id === event.deckId))
              void qc.invalidateQueries({ queryKey: ["decks"] });
          }
          if (event.type === "term") {
            found = [...found, event.term];
            setTerms(found);
          }
          if (event.type === "questions") {
            asked = event.questions;
            setQuestions(event.questions);
            setAnswers(event.questions.map((q) => q.default));
            setOwnAnswers(event.questions.map(() => ""));
          }
        },
        controller.signal,
      );
      clearTimeout(idle);
      setFinished(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: LESSON_ACCESS });
      setTicked(
        new Set(found.filter((term) => term.ticked && !term.existing).map((term) => term.id)),
      );
      // A beat on the finished scan, so the last words land before the screen moves on.
      setTimeout(() => {
        if (!controller.signal.aborted) setStep(asked.length > 0 ? "questions" : "list");
      }, 700);
    } catch (failure) {
      clearTimeout(idle);
      readOf.current = null;
      if (controller.signal.aborted && !quiet) return;
      setStep("input");
      void qc.invalidateQueries({ queryKey: LESSON_ACCESS });
      // The notice says the limit is reached; an error line under it would only repeat it.
      setError(
        quiet
          ? t`Couldn’t read the lesson. Try again.`
          : refusalCode(failure) === "daily_limit"
            ? undefined
            : errorMessage(failure),
      );
    }
  };

  /** The answers' drops leave the list unticked, but still on it, so nothing goes unseen. */
  const showTerms = async () => {
    setPending(true);
    try {
      const drops = new Set<string>();
      questions.forEach((q, i) => {
        for (const id of q.options[answers[i] ?? q.default]?.drop ?? []) drops.add(id);
      });
      const asked = questions.flatMap((q, i) =>
        answers[i] === OWN_ANSWER && ownAnswers[i]?.trim()
          ? [{ question: q.question, answer: ownAnswers[i].trim() }]
          : [],
      );
      const candidates = fresh.map((term) => ({ id: term.id, term: term.term, gloss: term.gloss }));
      if (asked.length > 0 && candidates.length > 0) {
        const results = await Promise.all(
          asked.map((a) => api.answerLesson({ ...a, terms: candidates.slice(0, 200) })),
        );
        for (const id of results.flatMap((r) => r.drop)) drops.add(id);
      }
      setTicked(
        new Set(fresh.filter((term) => term.ticked && !drops.has(term.id)).map((term) => term.id)),
      );
      setStep("list");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  };

  const add = async () => {
    if (!deck || ticked.size === 0 || pending) return;
    setPending(true);
    setError(undefined);
    const chosen = fresh.filter((term) => ticked.has(term.id));
    try {
      const { results } = await api.addCards(
        {
          cards: chosen.map((term) => {
            const edit = edits.get(term.id);
            const meaning =
              edit?.meaning !== undefined
                ? // The learner's own meaning is theirs; an emptied one is left for the AI.
                  edit.meaning
                  ? { meaning: edit.meaning }
                  : {}
                : term.meaning
                  ? { meaning: term.meaning, meaningSource: "lesson" as const }
                  : {};
            // The lesson's reading is for the lesson's spelling; a retyped term goes without it.
            const reading =
              term.pronunciation && (!edit || edit.term === term.term)
                ? { pronunciation: term.pronunciation, pronunciationSource: "lesson" as const }
                : {};
            return {
              deckId: deck.id,
              term: edit?.term ?? term.term,
              ...meaning,
              ...reading,
              ...(term.heading ? { source: term.heading } : {}),
            };
          }),
        },
        "lesson",
      );
      captureStore.set(CAPTURE_KEYS.smartAddDeck, deck.id);
      for (const queryKey of [["decks"], ["queue"], ["rounds"], ["activity"]])
        void qc.invalidateQueries({ queryKey });
      const added = results.filter((r) => r.status === "added").length;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const name = deck.name;
      toast.add({
        id: "smart-added",
        title:
          added > 0
            ? t`${plural(added, { one: `Added # card to ${{ name: isolate(name) }}`, other: `Added # cards to ${{ name: isolate(name) }}` })}`
            : t`Those terms are already in your decks`,
      });
      setAdded(true);
    } catch (failure) {
      setError(errorMessage(failure));
      setPending(false);
    }
  };
  // Leaves once the guard is off, so the swipe's question never asks about cards just added.
  useEffect(() => {
    if (added) router.back();
  }, [added, router]);

  const back = { icon: "back" as const, label: t`Back` };
  const header = (() => {
    switch (step) {
      case "writing":
        return (
          <FormHeader
            close={{ ...back, onPress: () => setStep("input") }}
            title={t`Lesson text`}
            action={{ icon: "check", label: t`Done`, onPress: () => setStep("input") }}
          />
        );
      case "reading":
        return (
          <FormHeader
            close={{
              label: t`Stop`,
              onPress: () => {
                stop.current?.abort();
                setStep("input");
              },
            }}
            middle={<SmartAddTitle />}
          />
        );
      case "questions":
        return (
          <FormHeader
            close={{ ...back, onPress: () => setStep("input") }}
            middle={<SmartAddTitle />}
            action={{
              icon: "check",
              label: t`Show terms`,
              busy: pending,
              onPress: () => void showTerms(),
            }}
          />
        );
      case "list":
        return (
          <FormHeader
            close={{
              ...back,
              onPress: () => setStep(questions.length > 0 ? "questions" : "input"),
            }}
            middle={
              fresh.length > 0 ? (
                <Select
                  label={t`Add to`}
                  value={deckId ?? ""}
                  options={decks.map((d) => ({ value: d.id, label: d.name }))}
                  onChange={setDeckId}
                  trigger={<GlassPill icon="deck">{deck?.name ?? t`Choose a deck`}</GlassPill>}
                />
              ) : (
                <SmartAddTitle />
              )
            }
            action={
              fresh.length > 0
                ? {
                    icon: "check",
                    label: t`${plural(ticked.size, { one: "Add # card", other: "Add # cards" })}`,
                    disabled: ticked.size === 0 || !deck || !online,
                    busy: pending,
                    onPress: () => void add(),
                  }
                : undefined
            }
          />
        );
      default:
        return (
          <FormHeader
            close={{ label: empty ? t`Close` : t`Cancel`, onPress: () => router.back() }}
            middle={<SmartAddTitle />}
            action={{
              icon: "check",
              label: t`Find terms`,
              disabled:
                empty || ((atLimit || !online) && !(finished && readOf.current === material)),
              onPress: () => void start(),
            }}
          />
        );
    }
  })();

  return (
    <View className="flex-1">
      {header}
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="grow px-5 pt-3 pb-10"
      >
        <Animated.View
          key={step}
          entering={reduce ? CROSSFADE : ARRIVE}
          exiting={LEAVE}
          className="grow"
        >
          {step === "input" && (
            <InputStep
              pages={pages}
              text={text}
              onRemovePage={(id) => {
                const removed = pages.find((page) => page.id === id);
                if (removed) discard(removed.uri);
                setPages((all) => all.filter((page) => page.id !== id));
              }}
              onEditText={() => setStep("writing")}
              onRemoveText={() => setText("")}
              sources={sources}
              error={error}
              daily={daily}
              online={online}
            />
          )}
          {step === "writing" && <WritingStep text={text} onChange={setText} inputRef={textRef} />}
          {step === "reading" && (
            <ReadingStep pages={pages} text={text} terms={fresh} finished={finished} />
          )}
          {step === "questions" && (
            <QuestionsStep
              questions={questions}
              answers={answers}
              ownAnswers={ownAnswers}
              onAnswer={(index, value) =>
                setAnswers((all) => all.map((a, i) => (i === index ? value : a)))
              }
              onOwnAnswer={(index, value) =>
                setOwnAnswers((all) => all.map((a, i) => (i === index ? value : a)))
              }
            />
          )}
          {step === "list" && (
            <ListStep
              fresh={fresh}
              existing={existing}
              ticked={ticked}
              edits={edits}
              onToggle={(id) => {
                setError(undefined);
                setTicked((all) => {
                  const next = new Set(all);
                  if (!next.delete(id)) next.add(id);
                  return next;
                });
              }}
              onToggleAll={() =>
                setTicked(
                  ticked.size === fresh.length ? new Set() : new Set(fresh.map((term) => term.id)),
                )
              }
              onOpen={setEditing}
              error={error}
            />
          )}
        </Animated.View>
        {/* Inside the scroll view: a form sheet lays out at most a header and one scroll view. */}
        {consent.sheet}
        <TermSheet
          term={editing}
          edit={editing ? edits.get(editing.id) : undefined}
          onClose={() => setEditing(null)}
          onSave={(edit) => {
            if (!editing) return;
            const id = editing.id;
            setEdits((all) => {
              const next = new Map(all);
              if (edit) next.set(id, edit);
              else next.delete(id);
              return next;
            });
            // An edited term is one the learner wants.
            if (edit) setTicked((all) => new Set(all).add(id));
          }}
        />
      </ScrollView>
    </View>
  );
}
