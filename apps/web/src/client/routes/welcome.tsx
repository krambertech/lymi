import { useLingui } from "@lingui/react/macro";
import type { OnboardingInput } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useAddCard } from "../lib/add-card";
import { api, type DeckSummary } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import { decksQuery, exploreQuery, settingsQuery } from "../lib/queries";
import { captureAnalytics } from "../lib/telemetry";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
import {
  clearWelcomeProgress,
  finishWelcomeStep,
  type Step,
  type WelcomeAnswers,
  WelcomeView,
} from "../views/welcome-view";

const Search = z.object({
  /** A deck an invitation or a public page added while signing up, set by the door page's redirect. */
  deck: z.string().optional(),
});

export const Route = createFileRoute("/welcome")({
  validateSearch: Search,
  component: Welcome,
});

const SKIP: OnboardingInput = { learningKind: null, learningLanguage: null, dailyGoal: null };

function Welcome() {
  const { t } = useLingui();
  useDocumentTitle(t`Welcome`);
  const navigate = useNavigate();
  const { deck } = Route.useSearch();
  const qc = useQueryClient();
  const add = useAddCard();
  // The persisted cache can predate finishing Welcome, so this mount asks the server again.
  const [mountedAt] = useState(Date.now);
  const settings = useQuery({ ...settingsQuery, refetchOnMount: "always" });
  const explore = useQuery(exploreQuery);
  const decks = useQuery({ ...decksQuery, enabled: deck !== undefined });
  const joined = deck ? decks.data?.find((d) => d.id === deck) : undefined;
  const addDeck = useAddPublishedDeck({ announce: "page" });
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: api.finishOnboarding,
    onSuccess: (value) => qc.setQueryData(settingsQuery.queryKey, value),
  });

  const finish = async (answers: WelcomeAnswers) => {
    setError(null);
    const { start } = answers;
    // Opened inside the press, before anything is awaited, or the browser blocks the new tab.
    if (start.kind === "own" && start.own === "assistant") {
      window.open(publicSiteUrl("/docs/mcp"), "_blank", "noopener");
    }
    let saving = false;
    try {
      if (start.kind === "deck") {
        await addDeck.mutateAsync({
          slug: start.deck.slug,
          name: start.deck.name,
          edition: start.deck.meaningLanguage,
        });
      }
      saving = true;
      await save.mutateAsync({
        learningKind: answers.learningKind,
        learningLanguage: answers.learningLanguage,
        dailyGoal: answers.dailyGoal,
      });
    } catch {
      // The add raises its own toast; saving the answers says so here.
      if (saving) setError(t`Couldn’t save your answers. Check your connection and try again.`);
      return;
    }
    captureAnalytics("empty_state_option_picked", {
      option:
        start.kind === "deck"
          ? "explore"
          : start.own === "assistant"
            ? "ai_mcp"
            : start.own === "type"
              ? "typed"
              : "import",
    });
    finishWelcomeStep("start", false);
    clearWelcomeProgress();
    if (start.kind === "deck") return navigate({ to: "/review", replace: true });
    if (start.own === "import") return navigate({ to: "/settings", hash: "import", replace: true });
    await navigate({ to: "/today", replace: true });
    if (start.own === "type") add.openDeck();
  };

  const startJoined = async (deck: DeckSummary, dailyGoal: number) => {
    setError(null);
    try {
      await save.mutateAsync({ ...SKIP, dailyGoal });
    } catch {
      setError(t`Couldn’t save your daily goal. Check your connection and try again.`);
      return;
    }
    finishWelcomeStep("goal", false);
    clearWelcomeProgress();
    // A deck shared before its owner added a card has nothing to review yet, so its page says so.
    if (deck.total === 0) {
      return navigate({ to: "/library/$deckId", params: { deckId: deck.id }, replace: true });
    }
    await navigate({ to: "/review", search: { deck: deck.id }, replace: true });
  };

  const skip = async (step: Step) => {
    setError(null);
    try {
      await save.mutateAsync(SKIP);
    } catch {
      setError(t`Couldn’t skip for now. Check your connection and try again.`);
      return;
    }
    finishWelcomeStep(step, true);
    clearWelcomeProgress();
    // Their deck's page, not Today's guide, which is about making a deck of their own.
    if (joined)
      return navigate({ to: "/library/$deckId", params: { deckId: joined.id }, replace: true });
    await navigate({ to: "/today", replace: true });
  };

  // A bookmark or an old return path never runs Welcome twice; Today is where a set-up learner goes.
  if (settings.data?.onboardedAt && !save.isPending && !save.isSuccess) {
    return <Navigate to="/today" replace />;
  }
  // The questions wait for that answer, timed because a restored copy keeps its old update count.
  const answered = settings.dataUpdatedAt >= mountedAt || settings.isError;
  if (!answered && settings.fetchStatus !== "paused") return null;
  // The view picks its questions once, so it waits for the deck; one no longer in Library gets them all.
  if (deck && !joined && (decks.isPending || decks.isFetching)) return null;
  return (
    <WelcomeView
      catalog={explore.data?.decks.filter((deck) => !explore.data.added[deck.slug])}
      meaningLanguage={settings.data?.meaningLanguage ?? "en"}
      onFinish={(answers) => void finish(answers)}
      joined={joined}
      onChooseGoal={joined && ((dailyGoal) => void startJoined(joined, dailyGoal))}
      onSkip={(step) => void skip(step)}
      busy={save.isPending || addDeck.isPending}
      error={error}
    />
  );
}
