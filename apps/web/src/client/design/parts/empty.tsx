import { KeyRound, Plug } from "lucide-react";
import { Button } from "../../components/button";
import { EmptySection, EmptyState, ErrorState, NoResults } from "../../components/empty-state";
import { NextStep, NextSteps } from "../../components/next-steps";
import { StartGuide } from "../../components/start-guide";
import { StartPanel, StartPanelSection } from "../../components/start-panel";
import { StatPlate } from "../../components/stat-plate";
import { Variants } from "../frame";
import { type Group, noop } from "./types";

const st = { path: "/design" };

export const empty: Group = {
  slug: "empty-states",
  title: "Empty states",
  lede: "What a screen or a group shows before it has anything in it, or when it could not load. Each says what is missing and how to fill it, and looks temporary so it is never mistaken for content. DESIGN.md, Empty states, has the rules.",
  entries: [
    {
      slug: "start-guide",
      name: "Getting started",
      source: "components/start-guide.tsx",
      note: "Today until the first review. Three steps in order, each done by the learner's own data; the current step holds its action.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "No decks",
              render: () => (
                <div className="w-full">
                  <StartGuide
                    decks={0}
                    cards={0}
                    connected={false}
                    connectUrl="/docs/mcp"
                    onAdd={noop}
                    onCreateDeck={noop}
                    st={st}
                  />
                </div>
              ),
            },
            {
              label: "A deck, no cards",
              render: () => (
                <div className="w-full">
                  <StartGuide
                    decks={1}
                    cards={0}
                    connected={false}
                    connectUrl="/docs/mcp"
                    onAdd={noop}
                    onCreateDeck={noop}
                    st={st}
                  />
                </div>
              ),
            },
            {
              label: "Cards, never reviewed",
              render: () => (
                <div className="w-full">
                  <StartGuide
                    decks={1}
                    cards={12}
                    connected={false}
                    connectUrl="/docs/mcp"
                    onAdd={noop}
                    onCreateDeck={noop}
                    st={st}
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
                        static={st}
                      />
                      <NextStep
                        icon={<KeyRound />}
                        title="Add cards with the API"
                        detail="Create a key in Settings"
                        to="/settings"
                        static={st}
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
                  body="Make one for each course or topic. Every card goes in a deck."
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
                    body="A key lets a script or curl read your decks, or add to them."
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
      note: "A search or filter that matched nothing is one line under the controls that caused it, with the way back.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Search",
              render: () => (
                <div className="w-full">
                  <NoResults
                    title="Nothing matches “sbrig”"
                    detail="Search looks at the term and the meaning."
                    action={<Button size="sm">Clear search</Button>}
                  />
                </div>
              ),
            },
            {
              label: "Filter",
              render: () => (
                <div className="w-full">
                  <NoResults
                    title="No Known cards in this deck"
                    action={<Button size="sm">Show all</Button>}
                  />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "coming-soon",
      name: "Coming soon",
      source: "components/empty-state.tsx",
      note: "A whole screen with nothing to outline. The brand lantern, still, because an empty screen says nothing about the streak.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Archived",
              render: () => (
                <EmptyState
                  className="w-full py-4"
                  title="Coming soon"
                  body="Cards and decks you archived. Restore puts them back."
                />
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
  ],
};
