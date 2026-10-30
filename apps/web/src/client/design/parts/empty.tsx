import { KeyRound, ListFilter, LoaderCircle, Plug, SearchX } from "lucide-react";
import { Button } from "../../components/button";
import { EmptySection, ErrorState, NoResults } from "../../components/empty-state";
import { FirstRunGuide } from "../../components/first-run";
import { NextStep, NextSteps } from "../../components/next-steps";
import { Skeleton } from "../../components/skeleton";
import { StartPanel, StartPanelSection } from "../../components/start-panel";
import { StatPlate } from "../../components/stat-plate";
import { Rule } from "../do-dont";
import { Variants } from "../frame";
import { decks } from "../mock";
import { type Group, noop } from "./types";

export const empty: Group = {
  slug: "empty-states",
  title: "Empty states",
  lede: "What a screen shows while it loads, before it has anything in it, or when it could not load. Each one says what’s missing and how to add it, and never looks like real content.",
  entries: [
    {
      slug: "first-run-guide",
      name: "Getting started",
      source: "components/first-run.tsx",
      note: "Today until the first review: three numbered steps on the bare canvas, dashed like every empty state and lit by the lantern, each ticked by the learner's own data; the current step holds its action. Create your first deck and ready-made decks follow it.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "No deck yet",
              render: () => (
                <div className="w-full">
                  <FirstRunGuide
                    name="Kateryna"
                    decks={[]}
                    play={false}
                    onAddCard={noop}
                    onSmartAdd={noop}
                  />
                </div>
              ),
            },
            {
              label: "An empty deck",
              render: () => (
                <div className="w-full">
                  <FirstRunGuide
                    name="Kateryna"
                    decks={[{ ...(decks[0] as (typeof decks)[number]), total: 0, due: 0 }]}
                    play={false}
                    onAddCard={noop}
                    onSmartAdd={noop}
                  />
                </div>
              ),
            },
            {
              label: "Cards, never reviewed",
              render: () => (
                <div className="w-full">
                  <FirstRunGuide
                    name="Kateryna"
                    decks={decks.slice(0, 1)}
                    play={false}
                    onAddCard={noop}
                    onSmartAdd={noop}
                  />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "start-panel",
      name: "Start panel",
      source: "components/start-panel.tsx",
      note: "A whole screen with nothing in it yet: Library, a deck, Insights. Dashed on the bare canvas, quieter than the page title, with one normal-size action and the other ways in under a dashed rule.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "With other ways in",
              note: "An empty deck. The rows open where the work happens.",
              render: () => (
                <StartPanel
                  className="w-full"
                  title="No cards in Estonian A2 yet"
                  body="Add cards from your last lesson, then review them here."
                  action={
                    <Button variant="primary" className="justify-self-start">
                      Add a card
                    </Button>
                  }
                >
                  <StartPanelSection>
                    <NextSteps label="Other ways to add cards">
                      <NextStep
                        icon={<Plug />}
                        title="Send a lesson from Claude or ChatGPT"
                        detail="Connect Lymi, paste the lesson, and ask for the cards"
                        href="/docs/mcp"
                      />
                      <NextStep
                        icon={<KeyRound />}
                        title="Add cards with the API"
                        detail="Create a key in Settings"
                        to="/settings"
                      />
                    </NextSteps>
                  </StartPanelSection>
                </StartPanel>
              ),
            },
            {
              label: "Action only",
              note: "Library with no decks.",
              render: () => (
                <StartPanel
                  className="w-full"
                  title="No decks yet"
                  body="Make one for each course or topic."
                  action={
                    <Button variant="primary" className="justify-self-start">
                      New deck
                    </Button>
                  }
                />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "ghost-plate",
      name: "Plates at zero",
      source: "components/stat-plate.tsx",
      note: "A screen whose layout is worth previewing keeps its real components on screen, dashed and muted with their figures drawn empty. Never a second drawing of the same shape.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Ghost StatPlate",
              note: "Insights with no history, under its start panel.",
              render: () => (
                <StatPlate
                  ghost
                  className="w-full"
                  label="Recall"
                  value="—"
                  note="How often you remember a card when it comes back"
                />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "empty-section",
      name: "Empty section",
      source: "components/empty-state.tsx",
      note: "An empty group inside a screen, such as API keys in Settings: an icon, a line of why, and the action that fills it.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "No API keys",
              render: () => (
                <div className="w-full">
                  <EmptySection
                    icon={<KeyRound />}
                    title="No keys yet"
                    body="Lets a script read or add to your decks."
                    action={<Button variant="primary">New key</Button>}
                  />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "no-results",
      name: "No results",
      source: "components/empty-state.tsx",
      note: "A search or filter that matched nothing takes the list's place under the controls that caused it: dashed, because it is temporary, with what to do and the way back.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Search",
              render: () => (
                <div className="w-full">
                  <NoResults
                    icon={<SearchX />}
                    title="No cards match “sbrig”"
                    detail="Try a different term or meaning, or clear the search."
                    action={<Button>Clear search</Button>}
                  />
                </div>
              ),
            },
            {
              label: "Filter",
              render: () => (
                <div className="w-full">
                  <NoResults
                    icon={<ListFilter />}
                    title="No cards match these filters"
                    detail="Remove a filter above, or show every card in this deck."
                    action={<Button>Show all</Button>}
                  />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "error-state",
      name: "Error state",
      source: "components/empty-state.tsx",
      note: "A screen that failed to load. An alert icon, never the lantern, so it cannot read as calm. The title says what failed, the line says the fix, and Try again retries.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Insights",
              render: () => (
                <ErrorState className="w-full py-4" title="Couldn’t load Insights" onRetry={noop} />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "skeleton",
      name: "Skeleton",
      source: "components/skeleton.tsx",
      note: "Holds the loaded shape, so nothing jumps when the data lands. It stops shimmering under reduced motion.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "A list loading",
              note: "A title line, then rows at their real height.",
              render: () => (
                <div className="grid w-full gap-2">
                  <Skeleton className="h-9 w-2/3" />
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                </div>
              ),
            },
          ]}
        />
      ),
    },
  ],
  Rules: EmptyRules,
};

function EmptyRules() {
  return (
    <>
      <Rule kind="do" title="Say what’s missing and how to add it.">
        <div className="grid justify-items-center gap-3 text-center">
          <p className="text-lg font-medium">No cards in Estonian A2 yet</p>
          <Button variant="primary">Add a card</Button>
        </div>
      </Rule>
      <Rule
        kind="dont"
        title="Write a big, vague message."
        note="Keep it smaller than the page, with a normal-size button."
      >
        <div className="grid justify-items-center gap-3 text-center">
          <p className="text-3xl font-medium">Nothing here</p>
          <Button size="xl" variant="primary">
            Get started
          </Button>
        </div>
      </Rule>
      <Rule kind="do" title="Show a skeleton while it loads.">
        <div className="grid w-full max-w-72 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </Rule>
      <Rule
        kind="dont"
        title="Show a spinner or “no cards” while it loads."
        note="If “no cards” flashes before the cards, it looks broken."
      >
        <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-ink-muted" />
      </Rule>
    </>
  );
}
