import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  AtSign,
  AudioLines,
  BookOpen,
  CalendarRange,
  Camera,
  Car,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Globe,
  LifeBuoy,
  MessagesSquare,
  Mic,
  Podcast,
  Repeat,
  SquareTerminal,
} from "lucide-react";
import type { ReactNode } from "react";
import { PRODUCT_ORIGIN } from "../../lib/origins";
import { Lantern } from "../Lantern";
import { type Ask, AssistantAsks } from "./AssistantAsks";
import {
  AssistantChatDemo,
  BackdropContext,
  type MadeCard,
  useBackdropPreview,
} from "./AssistantChatDemo";
import { AssistantConnect } from "./AssistantConnect";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import {
  Attached,
  CardsResult,
  CodeChip,
  ConversationResult,
  DeckResult,
  DueResult,
  FolderChip,
  HintResult,
  LinkChip,
  PagePhoto,
  Post,
  RoutineChip,
  SlippingResult,
} from "./AssistantPieces";
import { AssistantSignature } from "./AssistantSignature";
import { VoiceScene } from "./AssistantVoice";
import { ASSISTANT_PAGES, type AssistantKey } from "./assistant-pages";
import { CopyAddress } from "./ConnectSteps";
import { Wide } from "./FeatureSection";
import { Hero } from "./Hero";
import { LandingLayout } from "./LandingLayout";
import { OtherAssistants } from "./OtherAssistants";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SignUpSection } from "./SignUpSection";
import type { Step } from "./Steps";

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
  connect: { title: ReactNode; note: ReactNode; steps: readonly Step[] };
  faqTitle: ReactNode;
  signUp: ReactNode;
}

/** The lockup above each headline: Lymi beside the assistant, so the page says whose it is. */
function Lockup({ name }: { name: AssistantName }) {
  return (
    <p className="mb-7 flex items-center gap-2.5 text-md font-medium text-ink-secondary">
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

function useContent(key: AssistantKey): Content {
  const { t } = useLingui();
  const biology = msg`Biology`;
  const pharmacology = msg`Pharmacology`;
  const chemistry = msg`Chemistry`;
  const spanish = msg`Spanish`;

  switch (key) {
    case "chatgpt":
      return {
        headline: <Trans>Create and practise flashcards with ChatGPT.</Trans>,
        lead: (
          <Trans>
            Ask ChatGPT for flashcards from a photo of your notes, a textbook page or the chat you
            just had. They land in Lymi, where cards you remember come back later and the ones you
            forget come back sooner.
          </Trans>
        ),
        demo: {
          attachment: (
            <PagePhoto
              lines={["chlorophyll", "stomata", "glucose", "chloroplast"]}
              page={<Trans>p. 112</Trans>}
            />
          ),
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
            icon: <Camera aria-hidden="true" />,
            use: <Trans>From a photo of your notes</Trans>,
            body: (
              <Trans>
                Snap a page of notes or a textbook. ChatGPT reads it, skips the cards you already
                have and adds the rest.
              </Trans>
            ),
            attachment: (
              <PagePhoto lines={["xylem", "phloem", "stomata"]} page={<Trans>p. 114</Trans>} />
            ),
            ask: <Trans>Make cards from this page. Skip the ones I have.</Trans>,
            reply: <Trans>Added 2 cards to Biology. Skipped Stomata: you have that card.</Trans>,
            result: (
              <CardsResult
                lang="en"
                cards={[
                  { label: t`Biology`, term: "Xylem", meaning: t`Carries water up from the roots` },
                  { label: t`Biology`, term: "Phloem", meaning: t`Carries sugar around the plant` },
                ]}
              />
            ),
          },
          {
            id: "talk",
            icon: <AudioLines aria-hidden="true" />,
            use: <Trans>A dialogue in voice mode</Trans>,
            body: (
              <Trans>
                In voice mode, ChatGPT takes your words from Lymi and plays out a scene with you, so
                you hear each one and say it back.
              </Trans>
            ),
            ask: <Trans>Let’s practise a dialogue with my Italian words.</Trans>,
            dwell: 10000,
            scene: (
              <VoiceScene
                source={<Trans>10 words from Italian A2</Trans>}
                words={["prenotato", "tavolo", "ordinare", "conto"]}
                turns={[
                  { who: "you", text: t`Let’s practise a dialogue with my Italian words.` },
                  {
                    who: "assistant",
                    lang: "it",
                    text: "Certo! Sei al ristorante. Buonasera, ha prenotato?",
                  },
                  { who: "you", lang: "it", text: "Sì, ho prenotato un tavolo per due." },
                  {
                    who: "assistant",
                    lang: "it",
                    text: "Perfetto, prego. Volete ordinare subito?",
                  },
                  { who: "you", lang: "it", text: "Sì, e poi il conto, per favore." },
                ]}
              />
            ),
          },
          {
            id: "chat",
            icon: <MessagesSquare aria-hidden="true" />,
            use: <Trans>From the chat you just had</Trans>,
            body: (
              <Trans>
                Worked through a topic with ChatGPT? Turn the whole conversation into a deck, with a
                section for each part.
              </Trans>
            ),
            ask: <Trans>Turn what we just covered into a deck, a section per topic.</Trans>,
            reply: <Trans>Made a Photosynthesis deck with a section for each topic.</Trans>,
            result: (
              <DeckResult
                name={t`Photosynthesis`}
                count={<Trans>14 cards</Trans>}
                sections={[t`Light reactions`, t`Calvin cycle`, t`Leaves`]}
              />
            ),
          },
          {
            id: "exam",
            icon: <ClipboardCheck aria-hidden="true" />,
            use: <Trans>For an exam</Trans>,
            body: (
              <Trans>
                Hand ChatGPT the list you’ll be tested on and get a card for each item, with the
                detail the exam asks about.
              </Trans>
            ),
            attachment: <Attached name="NCLEX drug list.pdf" hint={<Trans>3 pages</Trans>} />,
            ask: <Trans>Make a card for each drug, with its class.</Trans>,
            reply: <Trans>Added 20 cards to NCLEX pharmacology.</Trans>,
            result: (
              <CardsResult
                lang="en"
                cards={[
                  { label: t`Pharmacology`, term: "Metoprolol", meaning: t`Beta blocker` },
                  { label: t`Pharmacology`, term: "Lisinopril", meaning: t`ACE inhibitor` },
                ]}
              />
            ),
          },
          {
            id: "slip",
            icon: <Repeat aria-hidden="true" />,
            use: <Trans>For the ones that slip</Trans>,
            body: (
              <Trans>
                ChatGPT can read your review history, so it knows which cards you keep forgetting
                and can drill just those.
              </Trans>
            ),
            ask: <Trans>Quiz me on the Spanish words I keep missing.</Trans>,
            reply: <Trans>These three keep slipping. Let’s start with la huelga.</Trans>,
            result: (
              <SlippingResult
                lang="es"
                words={[
                  { term: "la huelga", meaning: t`The strike`, forgot: <Trans>forgot 4×</Trans> },
                  { term: "el sindicato", meaning: t`The union`, forgot: <Trans>forgot 3×</Trans> },
                  { term: "ojalá", meaning: t`I hope`, forgot: <Trans>forgot 3×</Trans> },
                ]}
              />
            ),
          },
        ],
        gap: {
          title: <Trans>ChatGPT makes the cards. Lymi brings them back.</Trans>,
          body: (
            <Trans>
              ChatGPT’s own flashcards flip, shuffle and mark what you know. None of them decide
              when you see a card again. Lymi does: a card you remember waits longer each time, and
              one you forget comes back sooner.
            </Trans>
          ),
          term: "Stomata",
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
        headline: <Trans>Create and practise flashcards with Claude.</Trans>,
        lead: (
          <Trans>
            Ask Claude for flashcards from a long PDF, a lecture or a whole Project. They land in
            Lymi, where cards you remember come back later and the ones you forget come back sooner.
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
            icon: <FileText aria-hidden="true" />,
            use: <Trans>From a long PDF</Trans>,
            body: (
              <Trans>
                Give Claude a whole chapter or lecture. It picks the terms worth learning and writes
                each card.
              </Trans>
            ),
            attachment: <Attached name="Chapter 12.pdf" hint={<Trans>64 pages</Trans>} />,
            ask: <Trans>Make cards from the key terms in this chapter.</Trans>,
            reply: <Trans>Added 26 cards to Pharmacology.</Trans>,
            result: (
              <CardsResult
                lang="en"
                cards={[
                  {
                    label: t`Pharmacology`,
                    term: "Agonist",
                    meaning: t`Binds a receptor and switches it on`,
                  },
                  {
                    label: t`Pharmacology`,
                    term: "Half-life",
                    meaning: t`Time for the level to halve`,
                  },
                ]}
              />
            ),
          },
          {
            id: "voice",
            icon: <Mic aria-hidden="true" />,
            use: <Trans>Out loud, on a walk</Trans>,
            body: (
              <Trans>
                In voice mode, Claude can quiz you from your decks while you walk or cook. You
                answer out loud, and your reviews stay in Lymi.
              </Trans>
            ),
            ask: <Trans>Quiz me on the cranial nerves I keep missing.</Trans>,
            dwell: 10000,
            scene: (
              <VoiceScene
                source={<Trans>6 cards from Anatomy</Trans>}
                turns={[
                  { who: "you", text: t`Quiz me on the cranial nerves I keep missing.` },
                  { who: "assistant", text: t`Which nerve moves your tongue?` },
                  { who: "you", text: t`The hypoglossal.` },
                  { who: "assistant", text: t`Right. And which one closes your eyelids?` },
                  { who: "you", text: t`The facial nerve.` },
                ]}
              />
            ),
          },
          {
            id: "project",
            icon: <FolderOpen aria-hidden="true" />,
            use: <Trans>From a whole course</Trans>,
            body: (
              <Trans>
                In a Project with your course files, Claude can build one deck with a section for
                each lecture.
              </Trans>
            ),
            attachment: (
              <FolderChip
                name={t`Constitutional Law`}
                files={["Lecture 1.pdf", "Lecture 2.pdf", "Lecture 3.pdf"]}
              />
            ),
            ask: <Trans>Build a deck from this Project, one section per lecture.</Trans>,
            reply: <Trans>Built Constitutional Law with a section for each lecture.</Trans>,
            result: (
              <DeckResult
                name={t`Constitutional Law`}
                count={<Trans>64 cards</Trans>}
                sections={[t`Lecture 1`, t`Lecture 2`, t`Lecture 3`]}
                more={5}
              />
            ),
          },
          {
            id: "code",
            icon: <SquareTerminal aria-hidden="true" />,
            use: <Trans>While you code</Trans>,
            body: (
              <Trans>
                In Claude Code, turn what you just learned into cards without leaving the terminal.
              </Trans>
            ),
            attachment: (
              <CodeChip
                name="main.rs"
                lines={['let s = String::from("hi");', "take(s);", 'println!("{s}"); // error']}
              />
            ),
            ask: <Trans>Make cards for the ownership rules we hit today.</Trans>,
            reply: <Trans>Added Move and Borrow to your Rust deck.</Trans>,
            result: (
              <CardsResult
                lang="en"
                cards={[
                  { label: "Rust", term: "Move", meaning: t`Ownership passes to the new owner` },
                  { label: "Rust", term: "Borrow", meaning: t`Use a value without taking it` },
                ]}
              />
            ),
          },
          {
            id: "hint",
            icon: <LifeBuoy aria-hidden="true" />,
            use: <Trans>For a hard card</Trans>,
            body: (
              <Trans>
                Ask Claude for a memory trick on the cards you keep missing. It adds a hint you see
                before the card turns over.
              </Trans>
            ),
            ask: <Trans>Add a memory trick to the cards I missed this week.</Trans>,
            reply: <Trans>Added a memory trick to the 4 cards you missed.</Trans>,
            result: (
              <HintResult
                term="Bioavailability"
                hint={<Trans>Bio + available: how much of the dose your body can use.</Trans>}
              />
            ),
          },
        ],
        gap: {
          title: <Trans>Claude writes the cards. Lymi brings them back.</Trans>,
          body: (
            <Trans>
              Claude can quiz you today, but it has no deck that remembers you next week. Lymi does:
              a card you remember waits longer each time, and one you forget comes back sooner.
            </Trans>
          ),
          term: "Agonist",
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
        headline: <Trans>Create and practise flashcards with Gemini.</Trans>,
        lead: (
          <Trans>
            Ask Gemini for flashcards from your notes, a PDF or a web page. They land in Lymi, where
            cards you remember come back later and the ones you forget come back sooner.
          </Trans>
        ),
        demo: {
          attachment: (
            <Attached
              icon={<FileText aria-hidden="true" />}
              name="lecture-3.pdf"
              hint={<Trans>In this folder</Trans>}
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
          label: t`A lecture PDF in the folder goes to Gemini with “Make flashcards from this lecture.” It uses Lymi and adds four cards to a Chemistry deck: isomer, chiral, enantiomer and nucleophile.`,
        },
        asksTitle: <Trans>Things to ask Gemini.</Trans>,
        asks: [
          {
            id: "pdf",
            icon: <FileText aria-hidden="true" />,
            use: <Trans>From a PDF in the folder</Trans>,
            body: (
              <Trans>
                Gemini CLI reads the files where you run it. Point it at a lecture and get cards
                from the key terms.
              </Trans>
            ),
            attachment: <Attached name="lecture-4.pdf" hint={<Trans>In this folder</Trans>} />,
            ask: <Trans>Make cards from the key terms in lecture-4.pdf.</Trans>,
            reply: <Trans>Added 12 cards to Chemistry.</Trans>,
            result: (
              <CardsResult
                lang="en"
                cards={[
                  {
                    label: t`Chemistry`,
                    term: "Isomer",
                    meaning: t`Same formula, different structure`,
                  },
                  {
                    label: t`Chemistry`,
                    term: "Chiral",
                    meaning: t`Not the same as its mirror image`,
                  },
                ]}
              />
            ),
          },
          {
            id: "episode",
            icon: <Podcast aria-hidden="true" />,
            use: <Trans>From a podcast episode</Trans>,
            body: (
              <Trans>
                Drop an episode’s transcript in the folder. Gemini picks the words you don’t have
                yet and adds a card for each.
              </Trans>
            ),
            attachment: <Attached name="episodio-12.srt" hint={<Trans>Transcript</Trans>} />,
            ask: <Trans>Make Italian cards from this episode. Skip the words I know.</Trans>,
            reply: <Trans>Added 14 cards to Italian A2. Skipped 6 you have.</Trans>,
            result: (
              <CardsResult
                lang="it"
                cards={[
                  { label: t`Italian`, term: "la spesa", meaning: t`The grocery shopping` },
                  { label: t`Italian`, term: "affittare", meaning: t`To rent` },
                ]}
              />
            ),
          },
          {
            id: "web",
            icon: <Globe aria-hidden="true" />,
            use: <Trans>From a web page</Trans>,
            body: (
              <Trans>Give Gemini a link. It reads the page and turns its terms into cards.</Trans>
            ),
            attachment: <LinkChip url="kubernetes.io/docs/concepts" />,
            ask: <Trans>Make cards from the terms on this page.</Trans>,
            reply: <Trans>Added 9 cards to Kubernetes.</Trans>,
            result: (
              <CardsResult
                lang="en"
                cards={[
                  { label: "Kubernetes", term: "Pod", meaning: t`The smallest unit you deploy` },
                  { label: "Kubernetes", term: "Node", meaning: t`A machine that runs pods` },
                ]}
              />
            ),
          },
          {
            id: "due",
            icon: <SquareTerminal aria-hidden="true" />,
            use: <Trans>Before you start work</Trans>,
            body: (
              <Trans>
                Ask what’s due before you open your editor, and get through it in a few minutes.
              </Trans>
            ),
            ask: <Trans>What’s due in Lymi today?</Trans>,
            reply: <Trans>Here’s today in Lymi.</Trans>,
            result: (
              <DueResult
                count={18}
                time={<Trans>due · about six minutes</Trans>}
                decks={[
                  { name: "Kubernetes", due: 9 },
                  { name: t`Chemistry`, due: 6 },
                  { name: t`Spanish`, due: 3 },
                ]}
              />
            ),
          },
          {
            id: "plan",
            icon: <CalendarRange aria-hidden="true" />,
            use: <Trans>For test prep</Trans>,
            body: (
              <Trans>
                Ask for a whole deck with a plan. Gemini builds it in sections you can take one week
                at a time.
              </Trans>
            ),
            ask: <Trans>Make me an SAT vocabulary deck, a section a week.</Trans>,
            reply: <Trans>Made SAT words with a section for each week.</Trans>,
            result: (
              <DeckResult
                name={t`SAT words`}
                count={<Trans>120 cards</Trans>}
                sections={[t`Week 1`, t`Week 2`, t`Week 3`]}
                more={3}
              />
            ),
          },
        ],
        gap: {
          title: <Trans>Gemini makes the cards. Lymi brings them back.</Trans>,
          body: (
            <Trans>
              Gemini’s flashcards and quizzes show what you know today. Nothing brings a card back
              next week. Lymi does: a card you remember waits longer each time, and one you forget
              comes back sooner.
            </Trans>
          ),
          term: "Isomer",
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
        headline: <Trans>Create and practise flashcards with Grok Bot.</Trans>,
        lead: (
          <Trans>
            Tag Grok Bot on a post, hand it an article, or let it work through your notes while
            you’re away. The cards land in Lymi, where cards you remember come back later and the
            ones you forget come back sooner.
          </Trans>
        ),
        demo: {
          attachment: (
            <Post
              lang="es"
              text="Los precios del alquiler vuelven a subir y la huelga por la vivienda llega a tres ciudades."
            />
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
          label: t`A Spanish post from X goes to Grok Bot with “Make Spanish flashcards from this post.” It uses Lymi and adds four cards to a Spanish deck: el alquiler, subir, la huelga and la vivienda.`,
        },
        asksTitle: <Trans>Things to ask Grok Bot.</Trans>,
        asks: [
          {
            id: "post",
            icon: <AtSign aria-hidden="true" />,
            use: <Trans>From a post on X</Trans>,
            body: (
              <Trans>
                Tag Grok Bot under a post on X and it turns the words worth keeping into cards.
              </Trans>
            ),
            attachment: (
              <Post
                lang="es"
                text="Los sindicatos convocan una huelga general por el precio de la vivienda."
              />
            ),
            ask: <Trans>Turn this post into cards.</Trans>,
            reply: <Trans>Added 2 cards to Spanish. Skipped la huelga: you have that card.</Trans>,
            result: (
              <CardsResult
                lang="es"
                cards={[
                  { label: t`Spanish`, term: "el sindicato", meaning: t`The union` },
                  {
                    label: t`Spanish`,
                    term: "convocar",
                    meaning: t`To call (a strike, a meeting)`,
                  },
                ]}
              />
            ),
          },
          {
            id: "routine",
            icon: <Repeat aria-hidden="true" />,
            use: <Trans>Every morning</Trans>,
            body: (
              <Trans>
                Set a routine and Grok Bot checks Lymi each morning: what’s due, and how long it
                will take.
              </Trans>
            ),
            attachment: <RoutineChip when={<Trans>Every day at 8:00</Trans>} />,
            ask: <Trans>Tell me what’s due in Lymi.</Trans>,
            reply: <Trans>Good morning. Here’s today in Lymi.</Trans>,
            result: (
              <DueResult
                count={12}
                time={<Trans>due · about five minutes</Trans>}
                decks={[
                  { name: t`Spanish`, due: 8 },
                  { name: t`Economics`, due: 4 },
                ]}
              />
            ),
          },
          {
            id: "away",
            icon: <FolderOpen aria-hidden="true" />,
            use: <Trans>While you’re away</Trans>,
            body: (
              <Trans>
                Grok Bot works on its own cloud computer. Hand it a folder of notes and come back to
                a finished deck.
              </Trans>
            ),
            attachment: (
              <FolderChip
                name={t`Biology notes`}
                files={["cells.md", "genetics.md", "evolution.md"]}
              />
            ),
            ask: <Trans>Make cards from each of these files.</Trans>,
            reply: <Trans>Done. Biology has a section for each file.</Trans>,
            result: (
              <DeckResult
                name={t`Biology`}
                count={<Trans>48 cards</Trans>}
                sections={[t`Cells`, t`Genetics`, t`Evolution`]}
              />
            ),
          },
          {
            id: "explain",
            icon: <BookOpen aria-hidden="true" />,
            use: <Trans>Explain it, then card it</Trans>,
            body: (
              <Trans>
                Ask Grok Bot to explain a hard topic in plain words, then keep the key steps as
                cards.
              </Trans>
            ),
            ask: <Trans>Explain the Krebs cycle simply, then make cards for the key steps.</Trans>,
            reply: <Trans>Added 8 cards to Biochemistry.</Trans>,
            result: (
              <CardsResult
                lang="en"
                cards={[
                  {
                    label: t`Biochemistry`,
                    term: "Acetyl-CoA",
                    meaning: t`Joins oxaloacetate to start the cycle`,
                  },
                  { label: t`Biochemistry`, term: "NADH", meaning: t`Carries electrons onward` },
                ]}
              />
            ),
          },
          {
            id: "theory",
            icon: <Car aria-hidden="true" />,
            use: <Trans>Before your driving test</Trans>,
            body: (
              <Trans>
                Grok Bot can see which theory cards you keep missing and quiz you on just those, one
                question at a time.
              </Trans>
            ),
            ask: <Trans>Quiz me on the theory questions I get wrong.</Trans>,
            dwell: 9500,
            result: (
              <ConversationResult
                assistant="Grok Bot"
                source={<Trans>5 cards from Theory test</Trans>}
                lines={[
                  { who: "assistant", text: t`Stopping distance at 30 mph on a dry road?` },
                  { who: "you", text: t`23 metres.` },
                  { who: "assistant", text: t`Right. And at 50 mph?` },
                ]}
              />
            ),
          },
        ],
        gap: {
          title: <Trans>Grok Bot does the work. Lymi makes it stick.</Trans>,
          body: (
            <Trans>
              Grok Bot has no flashcards of its own and nothing that brings a word back later. Lymi
              does: a card you remember waits longer each time, and one you forget comes back
              sooner.
            </Trans>
          ),
          term: "subir",
          lang: "es",
        },
        connect: {
          title: <Trans>Connect Grok Bot in three steps.</Trans>,
          note: (
            <Trans>
              Grok Bot comes with X Premium, Super and Ultra, and with paid Cursor plans. Using Grok
              on grok.com instead? The same address works under Connectors.
            </Trans>
          ),
          steps: [
            {
              id: "add",
              title: <Trans>Add a custom connector</Trans>,
              body: (
                <Trans>
                  In the Grok Bot app, open Connect apps and choose Add a custom connector. Name it
                  Lymi, pick Remote HTTPS and paste this address.
                </Trans>
              ),
              after: <CopyAddress />,
            },
            {
              id: "client",
              title: <Trans>Give it Lymi’s client ID</Trans>,
              body: (
                <Trans>
                  Paste the client ID from the setup guide as the OAuth Client ID, then choose Add
                  plugin.
                </Trans>
              ),
            },
            {
              id: "allow",
              title: <Trans>Say yes in Lymi</Trans>,
              body: <Trans>Choose Authenticate, sign in to Lymi and allow it.</Trans>,
              after: <Allow name="Grok Bot" />,
            },
          ],
        },
        faqTitle: <Trans>Questions about Grok Bot and Lymi.</Trans>,
        signUp: <Trans>Keep what you learn with Grok Bot.</Trans>,
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

function AssistantPageHero({ assistant }: { assistant: AssistantKey }) {
  const { i18n } = useLingui();
  const { name, hue, listing } = ASSISTANT_PAGES[assistant];
  const content = useContent(assistant);
  const cards: MadeCard[] = content.demo.cards.map((card) => ({
    label: i18n._(card.label),
    term: card.term,
    meaning: i18n._(card.meaning),
  }));

  return (
    <Hero visualWidth={480}>
      <Hero.Copy>
        <Lockup name={name} />
        <Hero.Title size="page">{content.headline}</Hero.Title>
        <Hero.Lede>{content.lead}</Hero.Lede>
        <Hero.Actions
          secondary={
            listing
              ? { href: listing, label: <Trans>Add Lymi to {name}</Trans>, variant: "secondary" }
              : { href: "#connect", label: <Trans>Connect {name}</Trans> }
          }
        />
      </Hero.Copy>
      <Hero.Visual>
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
      </Hero.Visual>
    </Hero>
  );
}

/** A page for people who already use one assistant: what to ask it, and how Lymi keeps the rest. */
export function AssistantPageView({ assistant }: { assistant: AssistantKey }) {
  const { t } = useLingui();
  const page = ASSISTANT_PAGES[assistant];
  const content = useContent(assistant);
  const backdrop = useBackdropPreview();

  return (
    <BackdropContext.Provider value={backdrop}>
      <LandingLayout page={page.page} hero={<AssistantPageHero assistant={assistant} />}>
        <Wide
          title={content.asksTitle}
          body={
            <Trans>
              Once Lymi is connected, ask in your own words. The assistant finds the right deck and
              tells you what it changed.
            </Trans>
          }
        >
          <AssistantAsks
            assistant={page.name}
            hue={page.hue}
            label={t`What to ask ${page.name}`}
            asks={content.asks}
          />
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
    </BackdropContext.Provider>
  );
}
