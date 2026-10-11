import { useLingui } from "@lingui/react/macro";
import type { OnboardingInput } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAddCard } from "../lib/add-card";
import { api } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import { exploreQuery, settingsQuery } from "../lib/queries";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
import { type WelcomeAnswers, WelcomeView } from "../views/welcome-view";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

const SKIP: OnboardingInput = { learningKind: null, learningLanguage: null, dailyGoal: null };

function Welcome() {
  const { t } = useLingui();
  useDocumentTitle(t`Welcome`);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const add = useAddCard();
  const settings = useQuery(settingsQuery);
  const explore = useQuery(exploreQuery);
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
    if (start.kind === "deck") return navigate({ to: "/review", replace: true });
    if (start.own === "import") return navigate({ to: "/settings", hash: "import", replace: true });
    await navigate({ to: "/today", replace: true });
    if (start.own === "type") add.openDeck();
  };

  const skip = async () => {
    setError(null);
    try {
      await save.mutateAsync(SKIP);
    } catch {
      setError(t`Couldn’t skip for now. Check your connection and try again.`);
      return;
    }
    await navigate({ to: "/today", replace: true });
  };

  return (
    <WelcomeView
      catalog={explore.data?.decks.filter((deck) => !explore.data.added[deck.slug])}
      meaningLanguage={settings.data?.meaningLanguage ?? "en"}
      onFinish={(answers) => void finish(answers)}
      onSkip={() => void skip()}
      busy={save.isPending || addDeck.isPending}
      error={error}
    />
  );
}
