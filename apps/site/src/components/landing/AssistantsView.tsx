import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { AssistantHero } from "./AssistantHero";
import { ConnectSteps } from "./ConnectSteps";
import { FeatureSection } from "./FeatureSection";
import { ASSISTANTS_QUESTIONS } from "./faq";
import { LandingLayout } from "./LandingLayout";
import { BENTO_HUES, CheckList, LanguageBento, Tile } from "./LanguageBento";
import { DetailsSection, ReturnSection } from "./LanguageSections";
import { PracticeChat } from "./PracticeChat";
import { Questions } from "./Questions";
import { SendAnything } from "./SendAnything";
import { SignUpSection } from "./SignUpSection";

export const ASSISTANTS_TITLE = msg`Make cards with Claude, ChatGPT, Gemini or Grok · Lymi`;
export const ASSISTANTS_BLURB = msg`Send Claude, ChatGPT, Gemini or Grok a photo of your notes. It adds the cards to Lymi, where you review them.`;

/** A question in the chat and the small due view an assistant answers with. */
function DueInChat() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl:items-start"
    >
      <p className="justify-self-end rounded-2xl rounded-ee-sm bg-ink px-4 py-2.5 text-md text-canvas @3xl:col-start-1">
        <Trans>What’s due tonight?</Trans>
      </p>
      <div className="grid gap-1.5 rounded-md bg-plate p-4 edge">
        <p className="flex items-baseline justify-between text-md font-medium text-ink">
          <Trans>Due tonight</Trans>
          <span className="tabular-nums text-amber-text">24</span>
        </p>
        <p className="flex items-baseline justify-between text-md text-ink-secondary">
          <Trans>German</Trans>
          <span className="tabular-nums">14</span>
        </p>
        <p className="flex items-baseline justify-between text-md text-ink-secondary">
          <Trans>Spanish</Trans>
          <span className="tabular-nums">10</span>
        </p>
      </div>
    </div>
  );
}

/** Activity's rows for writes that came from an assistant. */
function ActivityRows() {
  return (
    <ul aria-hidden="true" className="grid gap-2">
      {[
        <Trans key="c">Claude added 14 cards to Biology</Trans>,
        <Trans key="g">ChatGPT changed 2 cards in German</Trans>,
      ].map((row) => (
        <li key={row.key} className="rounded-md bg-plate px-4 py-3 text-md text-ink edge">
          {row}
        </li>
      ))}
    </ul>
  );
}

/** The consent screen's two rows as `consent-view.tsx` draws them: read always on, write switched off. */
function Scopes() {
  return (
    <ul aria-hidden="true" className="grid gap-2">
      <li className="flex items-center justify-between gap-3 rounded-md bg-plate px-4 py-3 text-md text-ink edge">
        <Trans>See your decks and cards</Trans>
        <span className="shrink-0 text-sm text-ink-muted">
          <Trans>Always</Trans>
        </span>
      </li>
      <li className="flex items-center justify-between gap-3 rounded-md bg-plate px-4 py-3 text-md text-ink edge">
        <Trans>Add, edit and archive cards</Trans>
        <span className="flex h-5 w-9 shrink-0 items-center rounded-full bg-plate-nested px-0.5 edge-strong">
          <span className="size-4 rounded-full bg-ink-faint" />
        </span>
      </li>
    </ul>
  );
}

/** The page for people who already use an AI assistant: it makes the cards, Lymi keeps them. */
export function AssistantsView() {
  return (
    <LandingLayout page="assistants" hero={<AssistantHero />}>
      <SendAnything />

      <ConnectSteps />

      <FeatureSection
        title={<Trans>Practise with your own words.</Trans>}
        body={
          <Trans>
            Your assistant can read your decks. Ask it for a conversation that uses the words you’re
            learning, and it corrects you as you go.
          </Trans>
        }
      >
        <PracticeChat />
      </FeatureSection>

      <ReturnSection
        lang="de"
        term={() => "Tschüss"}
        title={<Trans>Then review them in Lymi.</Trans>}
        body={
          <Trans>
            Your assistant makes the cards; Lymi decides when you see them. Remember a card and it
            waits longer, forget it and it comes back soon. Assistants can never grade for you.
          </Trans>
        }
      />

      <DetailsSection
        title={<Trans>Built for working with AI.</Trans>}
        body={
          <Trans>
            Building your own app instead? The{" "}
            <a
              href="/docs/api"
              className="font-medium text-ink underline decoration-edge-strong underline-offset-4 hoverable:hover:decoration-current"
            >
              API reference
            </a>{" "}
            covers the same reads and writes.
          </Trans>
        }
      >
        <LanguageBento layout="wide">
          <Tile
            wide
            hue={BENTO_HUES[0]}
            title={<Trans>What’s due, in the chat</Trans>}
            body={
              <Trans>
                Ask what’s waiting and your assistant shows it right in the chat. Then open Lymi to
                review.
              </Trans>
            }
          >
            <DueInChat />
          </Tile>
          <Tile
            hue={BENTO_HUES[1]}
            title={<Trans>Skills for the jobs you repeat</Trans>}
            body={
              <Trans>
                The Lymi plugin gives your assistant a skill for each. It installs in Claude, Claude
                Code, Codex, Cursor and Gemini CLI.
              </Trans>
            }
          >
            <CheckList
              items={[
                <Trans key="l">Turn a lesson into cards</Trans>,
                <Trans key="t">Fix and tidy cards</Trans>,
                <Trans key="p">Practise in conversation</Trans>,
                <Trans key="w">A weekly check-in</Trans>,
              ]}
            />
          </Tile>
          <Tile
            hue={BENTO_HUES[2]}
            title={<Trans>Activity shows what it did</Trans>}
            body={
              <Trans>
                Every card an assistant adds or changes shows up in Activity, with the app that sent
                it.
              </Trans>
            }
          >
            <ActivityRows />
          </Tile>
          <Tile
            hue={BENTO_HUES[3]}
            title={<Trans>Read-only if you prefer</Trans>}
            body={
              <Trans>
                Turn off write access when you connect, and your assistant can read your decks but
                change nothing.
              </Trans>
            }
          >
            <Scopes />
          </Tile>
        </LanguageBento>
      </DetailsSection>

      <Questions
        title={<Trans>Questions before you connect.</Trans>}
        items={ASSISTANTS_QUESTIONS}
      />

      <SignUpSection title={<Trans>Bring your assistant to Lymi.</Trans>} />
    </LandingLayout>
  );
}
