import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { productUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { ApiConnections } from "./ApiConnections";
import { AssistantHero } from "./AssistantHero";
import { ConnectSteps } from "./ConnectSteps";
import type { SampleCard } from "./cards";
import { EnrichDemo } from "./EnrichDemo";
import { FeatureSection } from "./FeatureSection";
import { PracticeChat } from "./PracticeChat";
import { Questions } from "./Questions";
import { ReviewDemo } from "./ReviewDemo";
import { SendAnything } from "./SendAnything";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export const ASSISTANTS_TITLE = msg`Make cards with Claude, ChatGPT or Gemini · Lymi`;
export const ASSISTANTS_BLURB = msg`Send Claude, ChatGPT or Gemini a photo of your notes. The cards land in Lymi, which brings each one back right before you’d forget.`;

/** The hero's cards, back for a review. */
const GERMAN_REVIEW: SampleCard[] = [
  {
    label: msg`Deutsch · verb`,
    term: "aufhören",
    language: "de",
    meaning: msg`To stop`,
    example: "Ich höre jetzt auf.",
  },
  {
    label: msg`Deutsch · noun`,
    term: "Feierabend",
    language: "de",
    meaning: msg`The free evening after work`,
    example: "Schönen Feierabend!",
  },
  {
    label: msg`Deutsch · noun`,
    term: "das Mädchen",
    language: "de",
    meaning: msg`The girl`,
    example: "Das Mädchen liest ein Buch.",
  },
  {
    label: msg`Deutsch · noun`,
    term: "Schnapsidee",
    language: "de",
    meaning: msg`A bad idea that seemed good`,
    example: "Das war eine Schnapsidee.",
  },
];

const TYPED: SampleCard = {
  label: msg`Deutsch · noun`,
  term: "Feierabend",
  language: "de",
  meaning: msg`The free evening after work`,
  example: "Schönen Feierabend!",
  say: "FY-er-ah-bent",
};

/** The page for people who already use an AI assistant: it makes the cards, Lymi keeps them. */
export function AssistantsView() {
  const openAppUrl = new URL("/", productUrl()).toString();

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="assistants" />
        <AssistantHero />
      </header>

      <main>
        <SendAnything />

        <FeatureSection
          demoFirst
          title={<Trans>Then review them in Lymi.</Trans>}
          body={
            <Trans>
              Recall the word before you look, then say how well you knew it. Hard cards come back
              sooner, easy ones wait.
            </Trans>
          }
        >
          <ReviewDemo cards={GERMAN_REVIEW} />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Practise with your own words.</Trans>}
          body={
            <Trans>
              Your assistant can read your decks. Ask it for a conversation that uses the words
              you’re learning, and it corrects you as you go.
            </Trans>
          }
        >
          <PracticeChat />
        </FeatureSection>

        <FeatureSection
          demoFirst
          tinted
          title={<Trans>No chat? Type the word.</Trans>}
          body={
            <Trans>
              Lymi’s own AI fills in the meaning, an example and how to say it. It marks what it
              wrote and never overwrites yours.
            </Trans>
          }
        >
          <EnrichDemo card={TYPED} />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Or build your own.</Trans>}
          body={
            <Trans>
              Lymi has a public API. Add a word from a shortcut on your phone, bring in a list from
              a spreadsheet, or show what’s due on your own site.
            </Trans>
          }
          after={
            <div className="flex flex-wrap gap-2">
              <a href="/docs" className={buttonClass("secondary")}>
                <Trans>See how it works</Trans>
              </a>
              <a href="/docs/api" className={buttonClass("ghost")}>
                <Trans>API reference</Trans>
              </a>
            </div>
          }
        >
          <ApiConnections />
        </FeatureSection>

        <ConnectSteps />

        <Questions
          title={<Trans>Questions before you connect.</Trans>}
          items={[
            {
              id: "which",
              question: <Trans>Which assistants work?</Trans>,
              answer: (
                <Trans>
                  Claude, Claude Code, ChatGPT, Codex and Gemini CLI. Other apps that support MCP
                  can connect too.
                </Trans>
              ),
            },
            {
              id: "wrong",
              question: <Trans>What if it gets something wrong?</Trans>,
              answer: (
                <Trans>
                  Anything your assistant writes is marked AI on the card, so you can check it and
                  fix it in Lymi.
                </Trans>
              ),
            },
            {
              id: "privacy",
              question: <Trans>Does Lymi see my chats?</Trans>,
              answer: (
                <Trans>
                  No. Lymi only gets what your assistant sends it, like the cards it adds. The rest
                  of the conversation stays with your assistant.
                </Trans>
              ),
            },
            {
              id: "cost",
              question: <Trans>What does it cost?</Trans>,
              answer: <Trans>Nothing while Lymi is in public beta.</Trans>,
            },
          ]}
        />

        <SignUpSection title={<Trans>Bring your assistant to Lymi.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="assistants" />
    </div>
  );
}
