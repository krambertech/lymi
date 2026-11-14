import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { FileText, Link2, Play } from "lucide-react";
import type { ReactNode } from "react";
import { PRODUCT_ORIGIN, signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";
import { type Ask, AssistantAsks } from "./AssistantAsks";
import { AssistantChatDemo, type MadeCard } from "./AssistantChatDemo";
import { AssistantConnect, type ConnectStep } from "./AssistantConnect";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { AssistantSignature } from "./AssistantSignature";
import { ASSISTANT_PAGES, type AssistantKey } from "./assistant-pages";
import { CopyAddress } from "./ConnectSteps";
import { Wide } from "./FeatureSection";
import { LandingLayout } from "./LandingLayout";
import { OtherAssistants } from "./OtherAssistants";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SignUpSection } from "./SignUpSection";

interface SampleCard {
  label: MessageDescriptor;
  term: string;
  meaning: MessageDescriptor;
}

/** Everything that differs between the four pages. */
interface Content {
  headline: ReactNode;
  lead: ReactNode;
  demo: {
    attachment: ReactNode;
    ask: ReactNode;
    reply: ReactNode;
    cards: readonly SampleCard[];
    lang: string;
    label: string;
  };
  asksTitle: ReactNode;
  asks: readonly Ask[];
  gap: { title: ReactNode; body: ReactNode; term: string; lang: string };
  connect: { title: ReactNode; note: ReactNode; steps: readonly ConnectStep[] };
  faqTitle: ReactNode;
  signUp: ReactNode;
}

/** The lockup above each headline: Lymi beside the assistant, so the page says whose it is. */
function Lockup({ name }: { name: AssistantName }) {
  return (
    <p className="flex items-center gap-2.5 text-md font-medium text-ink-secondary">
      <span className="grid size-9 place-items-center rounded-xl bg-plate edge-drop">
        <Lantern className="size-6" />
      </span>
      <span aria-hidden="true" className="text-ink-muted">
        +
      </span>
      <span className="grid size-9 place-items-center rounded-xl bg-plate edge-drop [&_svg]:size-5">
        <AssistantMark name={name} />
      </span>
      <span>
        <Trans>Lymi for {name}</Trans>
      </span>
    </p>
  );
}

/** A photo of a textbook page, as the learner sent it. */
function PagePhoto({ lines }: { lines: readonly string[] }) {
  return (
    <div className="w-[168px] rotate-[2deg] rounded-md bg-canvas px-3.5 pt-2 pb-3 edge-drop">
      <p className="text-2xs text-ink-muted">
        <Trans>p. 112</Trans>
      </p>
      <ul className="notes-hand mt-0.5 text-lg leading-[1.1] text-ink-secondary">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** A file or a link sent with the ask, as a chip. */
function Attached({ icon, name, hint }: { icon: ReactNode; name: string; hint: ReactNode }) {
  return (
    <span className="flex w-fit items-center gap-2.5 rounded-xl bg-plate py-2 ps-2 pe-4 edge-drop">
      <span className="grid size-8 place-items-center rounded-lg bg-plate-nested text-ink-secondary [&_svg]:size-4">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{name}</span>
        <span className="text-2xs text-ink-muted">{hint}</span>
      </span>
    </span>
  );
}

/** A post on X, quoted in the chat. */
function Post({ text }: { text: string }) {
  return (
    <div className="w-[260px] rounded-xl bg-plate p-3 edge-drop">
      <p className="flex items-center gap-1.5 text-2xs text-ink-muted">
        <Link2 aria-hidden="true" className="size-3" />
        <Trans>Post on X</Trans>
      </p>
      <p lang="es" className="mt-1 text-sm text-pretty text-ink">
        {text}
      </p>
    </div>
  );
}

/** What Lymi did with something, in a reply: a word set apart in the learner's own text. */
function Words({ children, lang }: { children: ReactNode; lang: string }) {
  return (
    <span lang={lang} className="font-medium">
      {children}
    </span>
  );
}

function useContent(key: AssistantKey): Content {
  const { t } = useLingui();
  const biology = msg`Biology`;
  const pharmacology = msg`Pharmacology`;
  const chemistry = msg`Chemistry`;
  const spanish = msg`Español`;

  switch (key) {
    case "chatgpt":
      return {
        headline: <Trans>ChatGPT flashcards that stick.</Trans>,
        lead: (
          <Trans>
            Ask ChatGPT for flashcards from a photo of your notes, a textbook page or the chat you
            just had. They land in Lymi, and spaced repetition brings each one back right before
            you’d forget it.
          </Trans>
        ),
        demo: {
          attachment: <PagePhoto lines={["chlorophyll", "stomata", "glucose", "chloroplast"]} />,
          ask: <Trans>Make flashcards from this page.</Trans>,
          reply: <Trans>Added 4 cards to your Biology deck.</Trans>,
          cards: [
            { label: biology, term: "Chlorophyll", meaning: msg`The pigment that absorbs light` },
            { label: biology, term: "Stomata", meaning: msg`Pores that let gases in and out` },
            { label: biology, term: "Glucose", meaning: msg`The sugar photosynthesis makes` },
            { label: biology, term: "Chloroplast", meaning: msg`Where photosynthesis happens` },
          ],
          lang: "en",
          label: t`A photo of a textbook page goes to ChatGPT with “Make flashcards from this page.” It uses Lymi and adds four cards to a Biology deck: chlorophyll, stomata, glucose and chloroplast.`,
        },
        asksTitle: <Trans>Things to ask ChatGPT.</Trans>,
        asks: [
          {
            id: "photo",
            use: <Trans>From a photo of your notes</Trans>,
            ask: <Trans>Make cards from this page. Skip the ones I already have.</Trans>,
            did: <Trans>Added 9 cards to Biology and skipped 3 you had</Trans>,
          },
          {
            id: "chat",
            use: <Trans>From the chat you just had</Trans>,
            ask: <Trans>Turn what we just went over into a deck.</Trans>,
            did: <Trans>Made Photosynthesis: 14 cards</Trans>,
          },
          {
            id: "exam",
            use: <Trans>For an exam</Trans>,
            ask: <Trans>Make cards for the 20 drugs on my NCLEX list, with their class.</Trans>,
            did: <Trans>Added 20 cards to NCLEX pharmacology</Trans>,
          },
          {
            id: "due",
            use: <Trans>To plan tonight</Trans>,
            ask: <Trans>What should I review tonight?</Trans>,
            did: <Trans>18 cards due, about six minutes</Trans>,
          },
          {
            id: "missed",
            use: <Trans>For the ones that slip</Trans>,
            ask: <Trans>Quiz me on the Spanish words I keep missing.</Trans>,
            did: <Trans>Found the 7 cards you forgot most this month</Trans>,
          },
          {
            id: "tag",
            use: <Trans>To tidy a deck</Trans>,
            ask: <Trans>Tag everything from chapter 4 “exam”.</Trans>,
            did: <Trans>Tagged 31 cards “exam”</Trans>,
          },
        ],
        gap: {
          title: <Trans>ChatGPT makes the cards. Lymi brings them back.</Trans>,
          body: (
            <Trans>
              ChatGPT’s own flashcards flip, shuffle and mark what you know. None of them decide
              when you see a card again. Lymi does: each card returns as it starts to fade, and the
              gap grows every time you remember it.
            </Trans>
          ),
          term: "Chlorophyll",
          lang: "en",
        },
        connect: {
          title: <Trans>Connect ChatGPT in three steps.</Trans>,
          note: (
            <Trans>
              You need a ChatGPT plan or workspace that can add a custom MCP server. OpenAI decides
              which ones can.
            </Trans>
          ),
          steps: [
            {
              id: "add",
              title: <Trans>Add a custom server</Trans>,
              body: (
                <Trans>
                  In ChatGPT, open Plugins, press +, then Add custom MCP server. Name it Lymi and
                  paste this address.
                </Trans>
              ),
              after: <CopyAddress />,
            },
            {
              id: "oauth",
              title: <Trans>Choose OAuth</Trans>,
              body: (
                <Trans>
                  Pick OAuth, then Client ID Metadata Documents. Create it as a plugin. There’s no
                  key to paste.
                </Trans>
              ),
            },
            {
              id: "allow",
              title: <Trans>Say yes in Lymi</Trans>,
              body: (
                <Trans>Sign in to Lymi and allow it. Then pick Lymi with @ in a new chat.</Trans>
              ),
              after: <Allow name="ChatGPT" />,
            },
          ],
        },
        faqTitle: <Trans>Questions about ChatGPT and Lymi.</Trans>,
        signUp: <Trans>Keep what you learn with ChatGPT.</Trans>,
      };

    case "claude":
      return {
        headline: <Trans>Claude flashcards that stick.</Trans>,
        lead: (
          <Trans>
            Ask Claude for flashcards from a long PDF, a lecture or a whole Project. They land in
            Lymi, and spaced repetition brings each one back right before you’d forget it.
          </Trans>
        ),
        demo: {
          attachment: (
            <Attached
              icon={<FileText aria-hidden="true" />}
              name="Lecture 6.pdf"
              hint={<Trans>48 pages</Trans>}
            />
          ),
          ask: <Trans>Make flashcards from the key terms in this lecture.</Trans>,
          reply: <Trans>Added 4 cards to your Pharmacology deck.</Trans>,
          cards: [
            {
              label: pharmacology,
              term: "Agonist",
              meaning: msg`Binds a receptor and switches it on`,
            },
            {
              label: pharmacology,
              term: "Antagonist",
              meaning: msg`Binds a receptor and blocks it`,
            },
            {
              label: pharmacology,
              term: "Half-life",
              meaning: msg`Time for the level to halve`,
            },
            {
              label: pharmacology,
              term: "Bioavailability",
              meaning: msg`How much of a dose reaches the blood`,
            },
          ],
          lang: "en",
          label: t`A 48-page lecture PDF goes to Claude with “Make flashcards from the key terms in this lecture.” It uses Lymi and adds four cards to a Pharmacology deck: agonist, antagonist, half-life and bioavailability.`,
        },
        asksTitle: <Trans>Things to ask Claude.</Trans>,
        asks: [
          {
            id: "pdf",
            use: <Trans>From a long PDF</Trans>,
            ask: <Trans>Make cards from the key terms in this chapter.</Trans>,
            did: <Trans>Added 26 cards to Pharmacology</Trans>,
          },
          {
            id: "project",
            use: <Trans>From a whole course</Trans>,
            ask: <Trans>Build a deck from this Project’s files, one section per lecture.</Trans>,
            did: <Trans>Made Constitutional Law: 64 cards in 8 sections</Trans>,
          },
          {
            id: "code",
            use: <Trans>While you code</Trans>,
            ask: <Trans>Make cards for the Rust ownership rules we hit today.</Trans>,
            did: <Trans>Added 7 cards to Rust</Trans>,
          },
          {
            id: "missed",
            use: <Trans>Before an exam</Trans>,
            ask: <Trans>Quiz me on the cases I keep forgetting.</Trans>,
            did: <Trans>Found the 6 cards you forgot most this month</Trans>,
          },
          {
            id: "hint",
            use: <Trans>For a hard card</Trans>,
            ask: <Trans>Add a memory trick to the cards I missed this week.</Trans>,
            did: <Trans>Added hints to 5 cards</Trans>,
          },
          {
            id: "deck",
            use: <Trans>To check in</Trans>,
            ask: <Trans>How is my Anatomy deck doing?</Trans>,
            did: <Trans>212 cards: 31 due, 140 known</Trans>,
          },
        ],
        gap: {
          title: <Trans>Claude writes the cards. Lymi brings them back.</Trans>,
          body: (
            <Trans>
              Claude can quiz you today, but it has no deck that remembers you next week. Lymi does:
              each card returns as it starts to fade, and the gap grows every time you remember it.
            </Trans>
          ),
          term: "Bioavailability",
          lang: "en",
        },
        connect: {
          title: <Trans>Connect Claude in three steps.</Trans>,
          note: (
            <Trans>
              Works on every Claude plan, Free included: a free account can add one custom
              connector. On Team and Enterprise, an owner adds Lymi first.
            </Trans>
          ),
          steps: [
            {
              id: "add",
              title: <Trans>Add a custom connector</Trans>,
              body: (
                <Trans>
                  In Claude, open Settings, then Connectors, and choose Add custom connector. Paste
                  this address and leave the rest empty.
                </Trans>
              ),
              after: <CopyAddress />,
            },
            {
              id: "allow",
              title: <Trans>Say yes in Lymi</Trans>,
              body: <Trans>Claude opens Lymi in your browser. Sign in and allow it.</Trans>,
              after: <Allow name="Claude" />,
            },
            {
              id: "on",
              title: <Trans>Turn it on in a chat</Trans>,
              body: (
                <Trans>
                  Press + in the message box, choose Connectors and switch Lymi on. In Claude Code,
                  add it once:
                </Trans>
              ),
              after: (
                <Command text={`claude mcp add --transport http lymi ${PRODUCT_ORIGIN}/mcp`} />
              ),
            },
          ],
        },
        faqTitle: <Trans>Questions about Claude and Lymi.</Trans>,
        signUp: <Trans>Keep what you learn with Claude.</Trans>,
      };

    case "gemini":
      return {
        headline: <Trans>Gemini flashcards that stick.</Trans>,
        lead: (
          <Trans>
            Ask Gemini for flashcards from your notes, a document or a lecture video. They land in
            Lymi, and spaced repetition brings each one back right before you’d forget it.
          </Trans>
        ),
        demo: {
          attachment: (
            <Attached
              icon={<Play aria-hidden="true" />}
              name={t`Organic chemistry, lecture 3`}
              hint={<Trans>YouTube · 52 min</Trans>}
            />
          ),
          ask: <Trans>Make flashcards from this lecture.</Trans>,
          reply: <Trans>Added 4 cards to your Chemistry deck.</Trans>,
          cards: [
            { label: chemistry, term: "Isomer", meaning: msg`Same formula, different structure` },
            { label: chemistry, term: "Chiral", meaning: msg`Not the same as its mirror image` },
            {
              label: chemistry,
              term: "Enantiomer",
              meaning: msg`One of a mirror-image pair`,
            },
            {
              label: chemistry,
              term: "Nucleophile",
              meaning: msg`Gives away a pair of electrons`,
            },
          ],
          lang: "en",
          label: t`A YouTube lecture on organic chemistry goes to Gemini with “Make flashcards from this lecture.” It uses Lymi and adds four cards to a Chemistry deck: isomer, chiral, enantiomer and nucleophile.`,
        },
        asksTitle: <Trans>Things to ask Gemini.</Trans>,
        asks: [
          {
            id: "lecture",
            use: <Trans>From a lecture video</Trans>,
            ask: <Trans>Make cards from the lecture I just watched.</Trans>,
            did: <Trans>Added 12 cards to Chemistry</Trans>,
          },
          {
            id: "doc",
            use: <Trans>From your notes</Trans>,
            ask: <Trans>Make cards from my biology notes, one per term.</Trans>,
            did: <Trans>Added 15 cards to Biology</Trans>,
          },
          {
            id: "keep",
            use: <Trans>To keep Gemini’s flashcards</Trans>,
            ask: <Trans>Save these flashcards to Lymi.</Trans>,
            did: <Trans>Added 20 cards to SAT words</Trans>,
          },
          {
            id: "quiz",
            use: <Trans>After a quiz</Trans>,
            ask: <Trans>Make cards from the questions I got wrong.</Trans>,
            did: <Trans>Added 4 cards to Chemistry</Trans>,
          },
          {
            id: "plan",
            use: <Trans>For test prep</Trans>,
            ask: <Trans>Make me an SAT vocabulary deck, a section a week.</Trans>,
            did: <Trans>Made SAT words: 120 cards in 6 sections</Trans>,
          },
          {
            id: "cli",
            use: <Trans>From your terminal</Trans>,
            ask: <Trans>Add the terms from this README to my Kubernetes deck.</Trans>,
            did: <Trans>Added 11 cards to Kubernetes</Trans>,
          },
        ],
        gap: {
          title: <Trans>Gemini makes the cards. Lymi brings them back.</Trans>,
          body: (
            <Trans>
              Gemini’s flashcards and quizzes show what you know today. Nothing brings a card back
              next week. Lymi does: each card returns as it starts to fade, and the gap grows every
              time you remember it.
            </Trans>
          ),
          term: "Enantiomer",
          lang: "en",
        },
        connect: {
          title: <Trans>Connect Gemini in three steps.</Trans>,
          note: (
            <Trans>
              These steps are for Gemini CLI, which works anywhere. In the Gemini app, Google opens
              custom apps only to adults in the US, in English.
            </Trans>
          ),
          steps: [
            {
              id: "add",
              title: <Trans>Add Lymi to Gemini CLI</Trans>,
              body: (
                <Trans>
                  Put Lymi’s address in ~/.gemini/settings.json, with the client ID from the setup
                  guide.
                </Trans>
              ),
              after: <CopyAddress />,
            },
            {
              id: "allow",
              title: <Trans>Say yes in Lymi</Trans>,
              body: (
                <Trans>Run /mcp auth lymi. Your browser opens on Lymi. Sign in and allow it.</Trans>
              ),
              after: <Allow name="Gemini" />,
            },
            {
              id: "ask",
              title: <Trans>Ask for cards</Trans>,
              body: (
                <Trans>Run /mcp to see Lymi connected, then ask Gemini for your first cards.</Trans>
              ),
              after: <Command text="/mcp" />,
            },
          ],
        },
        faqTitle: <Trans>Questions about Gemini and Lymi.</Trans>,
        signUp: <Trans>Keep what you learn with Gemini.</Trans>,
      };

    case "grok":
      return {
        headline: <Trans>Grok flashcards that stick.</Trans>,
        lead: (
          <Trans>
            Ask Grok for flashcards from a post, an article or the words you practised. They land in
            Lymi, and spaced repetition brings each one back right before you’d forget it.
          </Trans>
        ),
        demo: {
          attachment: (
            <Post text="Los precios del alquiler vuelven a subir y la huelga por la vivienda llega a tres ciudades." />
          ),
          ask: <Trans>Make Spanish flashcards from this post.</Trans>,
          reply: <Trans>Added 4 cards to your Spanish deck.</Trans>,
          cards: [
            { label: spanish, term: "el alquiler", meaning: msg`The rent` },
            { label: spanish, term: "subir", meaning: msg`To go up` },
            { label: spanish, term: "la huelga", meaning: msg`The strike` },
            { label: spanish, term: "la vivienda", meaning: msg`Housing` },
          ],
          lang: "es",
          label: t`A Spanish post from X goes to Grok with “Make Spanish flashcards from this post.” It uses Lymi and adds four cards to a Spanish deck: el alquiler, subir, la huelga and la vivienda.`,
        },
        asksTitle: <Trans>Things to ask Grok.</Trans>,
        asks: [
          {
            id: "post",
            use: <Trans>From a post or a thread</Trans>,
            ask: <Trans>Turn this thread into cards.</Trans>,
            did: <Trans>Added 8 cards to Economics</Trans>,
          },
          {
            id: "talk",
            use: <Trans>After you practise</Trans>,
            ask: <Trans>Save the new Spanish words from our chat.</Trans>,
            did: <Trans>Added 6 cards to Spanish</Trans>,
          },
          {
            id: "news",
            use: <Trans>From the news</Trans>,
            ask: <Trans>Make cards for the terms in this article.</Trans>,
            did: <Trans>Added 5 cards to Climate</Trans>,
          },
          {
            id: "quiz",
            use: <Trans>For a quick quiz</Trans>,
            ask: <Trans>Quiz me on my Japanese deck.</Trans>,
            did: <Trans>Ten questions from your due cards</Trans>,
          },
          {
            id: "forget",
            use: <Trans>For the ones that slip</Trans>,
            ask: <Trans>Which words do I keep forgetting?</Trans>,
            did: (
              <Trans>
                Three keep slipping: <Words lang="es">la huelga, la vivienda, el sindicato</Words>
              </Trans>
            ),
          },
          {
            id: "due",
            use: <Trans>On the way home</Trans>,
            ask: <Trans>What should I review on the train?</Trans>,
            did: <Trans>12 cards due, about five minutes</Trans>,
          },
        ],
        gap: {
          title: <Trans>Grok explains it. Lymi makes it stick.</Trans>,
          body: (
            <Trans>
              Grok has no flashcards of its own and nothing that brings a word back later. Lymi
              does: each card returns as it starts to fade, and the gap grows every time you
              remember it.
            </Trans>
          ),
          term: "la vivienda",
          lang: "es",
        },
        connect: {
          title: <Trans>Connect Grok in three steps.</Trans>,
          note: (
            <Trans>
              xAI decides which Grok plans can add custom connectors. On a business account, an
              admin may need to turn it on first.
            </Trans>
          ),
          steps: [
            {
              id: "add",
              title: <Trans>Add a custom connector</Trans>,
              body: (
                <Trans>
                  Open grok.com/connectors, press New Connector, choose Custom and paste this
                  address.
                </Trans>
              ),
              after: <CopyAddress />,
            },
            {
              id: "client",
              title: <Trans>Give it Lymi’s client ID</Trans>,
              body: (
                <Trans>
                  Grok asks for OAuth details. Paste the client ID from the setup guide, leave the
                  secret empty and choose PKCE only.
                </Trans>
              ),
            },
            {
              id: "allow",
              title: <Trans>Say yes in Lymi</Trans>,
              body: <Trans>Press Save & Connect, sign in to Lymi and allow it.</Trans>,
              after: <Allow name="Grok" />,
            },
          ],
        },
        faqTitle: <Trans>Questions about Grok and Lymi.</Trans>,
        signUp: <Trans>Keep what you learn with Grok.</Trans>,
      };
  }
}

/** What the last step looks like in Lymi: the one question it asks. */
function Allow({ name }: { name: AssistantName }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-12 items-center gap-3 rounded-md bg-canvas ps-1.5 pe-1.5 edge"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-plate edge">
        <Lantern className="size-6" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink">
        <Trans>Let {name} add cards?</Trans>
      </span>
      <span className="flex h-9 items-center rounded-sm bg-amber px-3.5 text-sm font-medium text-amber-ink">
        <Trans>Allow</Trans>
      </span>
    </div>
  );
}

/** A command to type, as it reads in a terminal. A long one wraps rather than lose its end. */
function Command({ text }: { text: string }) {
  return (
    <code className="flex min-h-12 min-w-0 items-center rounded-md bg-plate px-4 py-3 font-mono text-sm break-all text-ink edge select-all">
      {text}
    </code>
  );
}

function Hero({ assistant }: { assistant: AssistantKey }) {
  const { i18n } = useLingui();
  const { name, hue, listing } = ASSISTANT_PAGES[assistant];
  const content = useContent(assistant);
  const cards: MadeCard[] = content.demo.cards.map((card) => ({
    label: i18n._(card.label),
    term: card.term,
    meaning: i18n._(card.meaning),
  }));

  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-14 px-5 pt-12 pb-20 @2xl:px-10 @4xl:min-h-[680px] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)] @4xl:gap-16 @4xl:pt-14">
      <div className="min-w-0 max-w-[560px]">
        <Lockup name={name} />
        <h1 className="mt-7 text-5xl leading-[1.04] font-medium tracking-[-0.038em] text-balance text-ink @4xl:text-[3.75rem]">
          {content.headline}
        </h1>
        <p className="mt-6 max-w-[42ch] text-lg text-pretty text-ink-secondary @2xl:text-xl">
          {content.lead}
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
            <Trans>Get started</Trans>
          </a>
          {listing ? (
            <a href={listing} className={buttonClass("secondary", "lg")}>
              <Trans>Add Lymi to {name}</Trans>
            </a>
          ) : (
            <a href="#connect" className={buttonClass("ghost", "lg")}>
              <Trans>Connect {name}</Trans>
            </a>
          )}
        </div>
      </div>

      <AssistantChatDemo
        assistant={name}
        hue={hue}
        attachment={content.demo.attachment}
        ask={content.demo.ask}
        reply={content.demo.reply}
        cards={cards}
        lang={content.demo.lang}
        label={content.demo.label}
      />
    </div>
  );
}

/** A page for people who already use one assistant: what to ask it, and how Lymi keeps the rest. */
export function AssistantPageView({ assistant }: { assistant: AssistantKey }) {
  const page = ASSISTANT_PAGES[assistant];
  const content = useContent(assistant);

  return (
    <LandingLayout page={page.page} hero={<Hero assistant={assistant} />}>
      <Wide
        title={content.asksTitle}
        body={
          <Trans>
            Once Lymi is connected, ask in your own words. The assistant finds the right deck and
            tells you what it changed.
          </Trans>
        }
      >
        <AssistantAsks assistant={page.name} hue={page.hue} asks={content.asks} />
      </Wide>

      <Wide title={content.gap.title} body={content.gap.body}>
        <ReturnLane
          lang={content.gap.lang}
          term={() => <span lang={content.gap.lang}>{content.gap.term}</span>}
        />
      </Wide>

      <AssistantSignature assistant={assistant} />

      <AssistantConnect
        title={content.connect.title}
        note={content.connect.note}
        steps={content.connect.steps}
        guide={page.guide}
        name={page.name}
        listing={page.listing}
      />

      <Questions title={content.faqTitle} items={page.questions} />

      <OtherAssistants current={assistant} title={<Trans>Use a different assistant?</Trans>} />

      <SignUpSection title={content.signUp} />
    </LandingLayout>
  );
}
