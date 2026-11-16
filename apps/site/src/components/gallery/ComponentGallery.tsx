import { clsx } from "clsx";
import { Languages, ListChecks, Smartphone } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { trayStyle } from "../../lib/tray";
import { Breadcrumb } from "../Breadcrumb";
import { buttonClass } from "../Button";
import { Wordmark } from "../Logo";
import { ArrowLink } from "../landing/ArrowLink";
import { Added, AssistantChat, Attachment } from "../landing/AssistantChat";
import { AssistantMarksWithMore, WorksWith } from "../landing/AssistantMarks";
import { Assurances } from "../landing/Assurances";
import { CardsHero } from "../landing/CardsHero";
import { AssistantAvatar, LearnerBubble, ToolCall, UsingLymi } from "../landing/ChatParts";
import { SAMPLE_CARDS, type SampleCard, USE_CASE_CARDS } from "../landing/cards";
import { ESTONIAN_FORM_SLOTS, FORM_WORDS } from "../landing/estonian";
import { FeatureSection, Wide } from "../landing/FeatureSection";
import { FreeBadge } from "../landing/FreeBadge";
import { MEDICINE_QUESTIONS } from "../landing/faq";
import { GERMAN_EXAMPLES, GERMAN_VERBS, germanHand } from "../landing/german";
import { Hero } from "../landing/Hero";
import { BENTO_HUES, CheckList, LanguageBento, Tile } from "../landing/LanguageBento";
import { LanguageHero, LanguageName } from "../landing/LanguageSections";
import { Pick } from "../landing/Pick";
import { Picker } from "../landing/Picker";
import { Questions } from "../landing/Questions";
import { ReturnLane } from "../landing/ReturnLane";
import { Section } from "../landing/Section";
import { SignUpSection } from "../landing/SignUpSection";
import { SmallCard } from "../landing/SmallCard";
import { SourceMark } from "../landing/SourceMark";
import { SpokenWords, useClipPlayer } from "../landing/SpokenWords";
import { Steps } from "../landing/Steps";
import { UseCases } from "../landing/UseCases";
import { WordForms } from "../landing/WordForms";

interface Entry {
  id: string;
  name: string;
  /** The file to import it from, under `apps/site/src/components`. */
  file: string;
  /** When a page should reach for it. */
  use: string;
  usage: string;
  /** "section" runs the specimen edge to edge, as a page band; "piece" sits it on a padded stage. */
  frame: "section" | "piece";
  specimen: () => ReactNode;
}

interface Group {
  id: string;
  name: string;
  intro: string;
  entries: Entry[];
}

function PickerSpecimen() {
  const words = ["vesi", "sõber", "käsi", "tuba"];
  const [at, setAt] = useState(0);
  return <Picker label="Choose a word" options={words} lang="et" at={at} onPick={setAt} />;
}

function SpokenWordsSpecimen() {
  const player = useClipPlayer("german");
  return <SpokenWords words={GERMAN_VERBS.slice(0, 4)} locale="en" lang="de" player={player} />;
}

function PickSpecimen() {
  const [on, setOn] = useState(true);
  return (
    <div className="grid justify-items-center gap-5">
      <p className="max-w-[40ch] text-center text-lg text-ink">
        The tutor said <Pick on={on}>echar de menos</Pick>, not perder.
      </p>
      <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setOn(!on)}>
        {on ? "Clear the pick" : "Pick it again"}
      </button>
    </div>
  );
}

const GROUPS: Group[] = [
  {
    id: "frame",
    name: "Page frame",
    intro:
      "Every landing page is LandingLayout around a hero and a stack of sections, closed by Questions and SignUpSection. Start a new page from this recipe.",
    entries: [
      {
        id: "recipe",
        name: "A new landing page",
        file: "landing/LandingLayout.tsx",
        use: "The nav over the hero, the sections in <main>, and the footer. Register the page in lib/routes.ts and add its uk and ru routes.",
        usage: `<LandingLayout page="medicine" hero={<CardsHero … />}>
  <UseCases title={…} items={…} />
  <FeatureSection title={…} body={…}>{demo}</FeatureSection>
  <Wide title={…} body={…}>{wide demo}</Wide>
  <DetailsSection title={…}><LanguageBento>…</LanguageBento></DetailsSection>
  <Questions title={…} items={…} />
  <SignUpSection title={…} />
</LandingLayout>`,
        frame: "piece",
        specimen: () => (
          <ol className="grid w-full max-w-[560px] gap-2 text-md">
            {[
              ["CardsHero or Hero", "Headline, one action, the thing it shows"],
              ["UseCases", "What people keep in Lymi, as trays"],
              ["FeatureSection / Wide", "One claim each, with the demo that proves it"],
              ["DetailsSection + LanguageBento", "The small things, as tiles"],
              ["Questions", "Plain answers, all open"],
              ["SignUpSection", "The one conversion, where the lantern lights"],
            ].map(([name, what]) => (
              <li
                key={name}
                className="flex flex-wrap items-baseline justify-between gap-x-4 rounded-md bg-plate px-4 py-3 edge"
              >
                <span className="font-medium text-ink">{name}</span>
                <span className="text-sm text-ink-muted">{what}</span>
              </li>
            ))}
          </ol>
        ),
      },
    ],
  },
  {
    id: "heroes",
    name: "Heroes",
    intro:
      "The top of a page. Hero is the set of parts every hero is made of; CardsHero and LanguageHero are the two ready-made ones.",
    entries: [
      {
        id: "hero",
        name: "Hero",
        file: "landing/Hero.tsx",
        use: "A hero that shows something of its own. Put the parts inside `Hero.Copy` in this order and leave out the ones you don't need. `Hero.Title` is `display` for a page about Lymi and `page` for one about a single thing; `measure` breaks a headline early. `Hero.Actions` always leads with Get started, and a ghost second link gets an arrow.",
        usage: `<Hero visualWidth={480}>
  <Hero.Copy>
    <Hero.Badges><FreeBadge /></Hero.Badges>
    <Hero.Title size="page">{headline}</Hero.Title>
    <Hero.Lede>{lede}</Hero.Lede>
    <Hero.Actions secondary={{ href: "#connect", label: <Trans>How to connect</Trans> }} />
  </Hero.Copy>
  <Hero.Visual>
    <YourScene />
  </Hero.Visual>
</Hero>`,
        frame: "section",
        specimen: () => (
          <Hero>
            <Hero.Copy>
              <Hero.Badges>
                <FreeBadge />
              </Hero.Badges>
              <Hero.Title size="page">One deck for your whole class.</Hero.Title>
              <Hero.Lede>
                Snap your lesson notes into cards, build the course in sections and share one link.
              </Hero.Lede>
              <Hero.Actions
                secondary={{ href: "#hero", label: "Add a deck", variant: "secondary" }}
              />
            </Hero.Copy>
            <Hero.Visual>
              <div
                style={trayStyle(BENTO_HUES[1])}
                className="use-case-tile grid aspect-[4/3] place-items-center rounded-[20px] text-sm text-ink-secondary"
              >
                Your visual
              </div>
            </Hero.Visual>
          </Hero>
        ),
      },
      {
        id: "cards-hero",
        name: "CardsHero",
        file: "landing/CardsHero.tsx",
        use: "A page that sells Lymi or one way to use it: the copy beside a hand of cards to turn over. `behind` draws what the cards came from; `visual` swaps in a scene of its own.",
        usage: `<CardsHero
  badge={<FreeBadge />}
  title={<Trans>Flashcards for medical school.</Trans>}
  lede={<Trans>…</Trans>}
  secondary={{ href: "#lecture", label: <Trans>See how it works</Trans> }}
  after={<WorksWith names={["Claude", "ChatGPT"]} />}
  cards={HAND}
/>`,
        frame: "section",
        specimen: () => (
          <CardsHero
            badge={<FreeBadge />}
            title="Flashcards for the AI era."
            lede="Make cards from your notes, lessons and photos with AI. Remember what you learn with reviews that adapt to you."
            secondary={{ href: "#cards-hero", label: "Browse free decks" }}
            after={<WorksWith names={["Claude", "ChatGPT", "Grok", "Gemini"]} />}
          />
        ),
      },
      {
        id: "language-hero",
        name: "LanguageHero",
        file: "landing/LanguageSections.tsx",
        use: "A language's page: its name in its own script, the headline, and a hand of its cards with example sentences drifting round it.",
        usage: `<LanguageHero
  kicker={<LanguageName lang="de">Deutsch</LanguageName>}
  title={<Trans>German words you’ll remember.</Trans>}
  lede={<Trans>…</Trans>}
  start={{ href: addDeckUrl(firstDeck), label: <Trans>Start with A1 words</Trans> }}
  cards={germanHand(locale)}
  examples={GERMAN_EXAMPLES}
  lang="de"
/>`,
        frame: "section",
        specimen: () => (
          <LanguageHero
            kicker={<LanguageName lang="de">Deutsch</LanguageName>}
            title="German words you’ll remember."
            lede="Learn German words in a few minutes a day, every noun with its der, die or das."
            start={{ href: "#language-hero", label: "Start with A1 words" }}
            cards={germanHand("en")}
            examples={GERMAN_EXAMPLES}
            lang="de"
          />
        ),
      },
    ],
  },
  {
    id: "sections",
    name: "Sections",
    intro:
      "Every band of a page sits in Section: one gutter, one rhythm, one 1040px column. Reach for FeatureSection or Wide before building a section by hand.",
    entries: [
      {
        id: "feature-section",
        name: "FeatureSection",
        file: "landing/FeatureSection.tsx",
        use: "One claim beside the demo that proves it. `demoFirst` swaps the sides on wide screens; `tinted` sets the band apart.",
        usage: `<FeatureSection
  title={<Trans>Bring your Anki decks.</Trans>}
  body={<Trans>…</Trans>}
  after={<ArrowLink href="/docs/import-from-anki">…</ArrowLink>}
>
  <ImportDemo … />
</FeatureSection>`,
        frame: "section",
        specimen: () => (
          <FeatureSection
            title="Ask what to review."
            body="Your assistant can also tell you what’s due before the next lesson, or which words you keep getting wrong."
            after={<AssistantMarksWithMore />}
          >
            <AssistantChat />
          </FeatureSection>
        ),
      },
      {
        id: "wide",
        name: "Wide",
        file: "landing/FeatureSection.tsx",
        use: "The heading and its line above a demo that needs the column's whole width. `action` puts a link at the end of the heading's row.",
        usage: `<Wide title={<Trans>Review less, remember longer.</Trans>} body={<Trans>…</Trans>}>
  <ReturnLane lang="ja" term={…} />
</Wide>`,
        frame: "section",
        specimen: () => (
          <Wide
            title="Review less, remember longer."
            body="Each time you remember a card, Lymi waits longer before showing it again. Forget it, and it comes back soon."
            action={<ArrowLink href="#wide">How scheduling works</ArrowLink>}
          >
            <ReturnLane lang="de" term={() => "der Tag"} />
          </Wide>
        ),
      },
      {
        id: "section",
        name: "Section",
        file: "landing/Section.tsx",
        use: "A section that FeatureSection and Wide don't fit. Every section has a `Section.Title`, which names it for screen readers. `surface` is canvas, plate or nested; `spacing` is default, end or ruled. `Section.Action` sits at the end of the heading's row on wide screens; `Section.Title` `sm` is for reference pages such as an exam.",
        usage: `<Section id="connect" surface="nested">
  <Section.Header>
    <Section.Title><Trans>Connect in three steps.</Trans></Section.Title>
    <Section.Body><Trans>…</Trans></Section.Body>
    <Section.Action><ArrowLink href="…">…</ArrowLink></Section.Action>
  </Section.Header>
  {content}
</Section>`,
        frame: "section",
        specimen: () => (
          <>
            <Section surface="plate">
              <Section.Header>
                <Section.Title>On plate, with an action</Section.Title>
                <Section.Body>
                  The heading and its line on the start side; the link on to the rest at the end of
                  the row.
                </Section.Body>
                <Section.Action>
                  <ArrowLink href="#section" size="md">
                    All free decks
                  </ArrowLink>
                </Section.Action>
              </Section.Header>
            </Section>
            <Section surface="nested">
              <Section.Header align="center">
                <Section.Title>Centred, on nested</Section.Title>
                <Section.Body>For a section that stands on its own between two demos.</Section.Body>
              </Section.Header>
            </Section>
            <Section spacing="ruled">
              <Section.Header>
                <Section.Title size="sm">Ruled, with the small title</Section.Title>
              </Section.Header>
            </Section>
          </>
        ),
      },
      {
        id: "use-cases",
        name: "UseCases",
        file: "landing/UseCases.tsx",
        use: "What people keep in Lymi, four trays each holding a real card. The first is tall, the second wide.",
        usage: `<UseCases title={<Trans>Every subject on one schedule.</Trans>} items={subjects} />`,
        frame: "section",
        specimen: () => (
          <UseCases
            title="For anything you’re learning."
            items={[
              {
                id: "languages",
                title: "A new language",
                body: "Words and phrases from lessons, chats and books.",
                card: USE_CASE_CARDS.languages,
                link: { href: "#use-cases", label: "Lymi for language learning" },
              },
              {
                id: "courses",
                title: "A course or lesson",
                body: "What you need to know for a class or an exam.",
                card: USE_CASE_CARDS.courses,
              },
              {
                id: "work",
                title: "Work",
                body: "Terms from a new job or project.",
                card: USE_CASE_CARDS.professionalTerms,
              },
              {
                id: "hobby",
                title: "A hobby",
                body: "Anything you pick up and want to remember.",
                card: USE_CASE_CARDS.personalInterests,
              },
            ]}
          />
        ),
      },
      {
        id: "assurances",
        name: "Assurances",
        file: "landing/Assurances.tsx",
        use: "Three practical doubts answered in one row, before the page asks for anything.",
        usage: `<Assurances label={<Trans>Why decks work</Trans>} items={[{ id, icon, title, body }, …]} />`,
        frame: "section",
        specimen: () => (
          <div className="pb-16">
            <Assurances
              label="Why decks work"
              items={[
                {
                  id: "language",
                  icon: Languages,
                  title: "In the test’s language",
                  body: "Each question as the exam asks it, with a translation alongside.",
                },
                {
                  id: "all",
                  icon: ListChecks,
                  title: "Every question",
                  body: "The whole official catalogue, not a sample.",
                },
                {
                  id: "phone",
                  icon: Smartphone,
                  title: "On your phone",
                  body: "Review on the bus. It works offline too.",
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "questions",
        name: "Questions",
        file: "landing/Questions.tsx",
        use: "Plain answers, all open. Its items also feed the page's structured data through MarketingLayout.",
        usage: `<Questions title={<Trans>Common questions.</Trans>} items={MEDICINE_QUESTIONS} />`,
        frame: "section",
        specimen: () => (
          <Questions
            title="Questions from medical students."
            items={MEDICINE_QUESTIONS.slice(0, 3)}
          />
        ),
      },
      {
        id: "sign-up-section",
        name: "SignUpSection",
        file: "landing/SignUpSection.tsx",
        use: "The page's last section and only conversion. The lantern lights the first time it is on screen; it is the one glow a page gets.",
        usage: `<SignUpSection title={<Trans>Start with your next lecture.</Trans>} />`,
        frame: "section",
        specimen: () => <SignUpSection title="Start learning" />,
      },
    ],
  },
  {
    id: "blocks",
    name: "Building blocks",
    intro: "The pieces sections are made of.",
    entries: [
      {
        id: "bento",
        name: "LanguageBento, Tile",
        file: "landing/LanguageBento.tsx",
        use: "Small things done well, as coloured tiles. Walk BENTO_HUES in order; `wide` runs a tile across the grid. Examples, CheckList and NoteRows are the usual tile contents.",
        usage: `<LanguageBento layout="wide">
  <Tile wide hue={BENTO_HUES[0]} title={…} body={…}>{demo}</Tile>
  <Tile hue={BENTO_HUES[1]} title={…} body={…}>{demo}</Tile>
</LanguageBento>`,
        frame: "piece",
        specimen: () => (
          <div className="w-full">
            <LanguageBento layout="wide">
              <Tile
                wide
                hue={BENTO_HUES[0]}
                title="Go over one block before the exam"
                body="Your Anki tags come along. Pick one and review just those cards."
              >
                <CheckList items={["Cards and tags", "Pictures", "Review history"]} />
              </Tile>
              {BENTO_HUES.slice(1).map((hue) => (
                <Tile key={hue} hue={hue} title={`Hue ${hue}`} body="One idea per tile.">
                  <span className="text-sm text-ink-muted">Demo</span>
                </Tile>
              ))}
            </LanguageBento>
          </div>
        ),
      },
      {
        id: "steps",
        name: "Steps",
        file: "landing/Steps.tsx",
        use: "Setup a visitor follows in order. Each step's picture lines up with the others however the copy wraps.",
        usage: `<Steps steps={[{ id: "copy", title: …, body: …, after: <CopyAddress /> }, …]} />`,
        frame: "piece",
        specimen: () => (
          <div className="w-full">
            <Steps
              steps={[
                {
                  id: "copy",
                  title: "Copy Lymi’s address",
                  body: "The same address works everywhere.",
                  after: <code className="text-sm text-ink-secondary">lymi.app/mcp</code>,
                },
                {
                  id: "add",
                  title: "Add it to your assistant",
                  body: "Pick your assistant for its steps.",
                },
                {
                  id: "allow",
                  title: "Say yes in Lymi",
                  body: "Sign in and let it add cards. Then send it your notes.",
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "links",
        name: "Buttons, ArrowLink, Breadcrumb",
        file: "Button.tsx · landing/ArrowLink.tsx · Breadcrumb.tsx",
        use: "One primary per view, from buttonClass on a link. ArrowLink is the quiet way on to another page under a section's copy. Breadcrumb goes one level up above a reference page's headline.",
        usage: `<a href={signUpUrl()} className={buttonClass("primary", "lg")}>…</a>
<ArrowLink href={…} size="md">All free decks</ArrowLink>
<Breadcrumb parent={{ href: examsPath(locale), label: <Trans>Exam prep</Trans> }} here={name} />`,
        frame: "piece",
        specimen: () => (
          <div className="grid justify-items-start gap-6">
            <div className="flex flex-wrap gap-2.5">
              <a href="#links" className={buttonClass("primary", "lg")}>
                Primary
              </a>
              <a href="#links" className={buttonClass("secondary", "lg")}>
                Secondary
              </a>
              <a href="#links" className={buttonClass("ghost", "lg")}>
                Ghost
              </a>
            </div>
            <div className="flex flex-wrap gap-6">
              <ArrowLink href="#links">Small arrow link</ArrowLink>
              <ArrowLink href="#links" size="md">
                Medium arrow link
              </ArrowLink>
            </div>
            <Breadcrumb parent={{ href: "#links", label: "Exam prep" }} here="Einbürgerungstest" />
          </div>
        ),
      },
      {
        id: "marks",
        name: "FreeBadge, WorksWith, AssistantMarksWithMore",
        file: "landing/FreeBadge.tsx · landing/AssistantMarks.tsx",
        use: "FreeBadge goes in HeroBadges. WorksWith is the quiet row under a hero's buttons; AssistantMarksWithMore sits under copy about assistants.",
        usage: `<HeroBadges><FreeBadge /></HeroBadges>
<WorksWith names={["Claude", "ChatGPT", "Grok", "Gemini"]} />
<AssistantMarksWithMore />`,
        frame: "piece",
        specimen: () => (
          <div className="grid justify-items-start gap-6">
            <FreeBadge />
            <WorksWith names={["Claude", "ChatGPT", "Grok", "Gemini"]} />
            <AssistantMarksWithMore />
          </div>
        ),
      },
    ],
  },
  {
    id: "demos",
    name: "Demos",
    intro:
      "Small working pictures of the product. They play once when on screen and hold still when motion is reduced.",
    entries: [
      {
        id: "chat",
        name: "AssistantChat, Added, Attachment",
        file: "landing/AssistantChat.tsx",
        use: "A short scripted chat with an assistant: the learner in ink, the assistant's answers as plain text. Added is the call to Lymi, what it did and the card it made; Attachment is what the learner sent.",
        usage: `<AssistantChat conversation={[
  { from: "you", attachment: <Attachment name="IMG_2041.jpg" kind={<Trans>Photo</Trans>} photo />, body: ask },
  { from: "them", body: <Added card={card}>{reply}</Added> },
]} />`,
        frame: "piece",
        specimen: () => (
          <AssistantChat
            conversation={[
              {
                from: "you",
                attachment: <Attachment name="Lesson 4.pdf" kind="PDF" />,
                body: "Add the new words from today’s lesson.",
              },
              {
                from: "them",
                body: (
                  <Added card={SAMPLE_CARDS[0] as SampleCard}>Added 12 cards to Finnish.</Added>
                ),
              },
            ]}
          />
        ),
      },
      {
        id: "chat-parts",
        name: "LearnerBubble, AssistantAvatar, ToolCall, UsingLymi",
        file: "landing/ChatParts.tsx",
        use: 'The pieces of an assistant\'s chat window, each taking motion props so it can arrive on its own beat. ToolCall is `on="plate"` inside a chat window that is already a plate.',
        usage: `<LearnerBubble initial={false} animate={appear(at("ask"))}>{ask}</LearnerBubble>
<AssistantAvatar name="Claude" />
<ToolCall><UsingLymi done={at("called")} /></ToolCall>`,
        frame: "piece",
        specimen: () => (
          <div className="flex w-full max-w-[420px] flex-col gap-3">
            <LearnerBubble>How is my Anatomy deck doing?</LearnerBubble>
            <div className="flex items-start gap-2.5">
              <AssistantAvatar name="Claude" />
              <div className="flex flex-col gap-2">
                <ToolCall>
                  <UsingLymi done={false} />
                </ToolCall>
                <ToolCall>
                  <UsingLymi done />
                </ToolCall>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-plate p-4 edge">
              <ToolCall on="plate">Read your German deck</ToolCall>
            </div>
          </div>
        ),
      },
      {
        id: "source-mark",
        name: "SourceMark",
        file: "landing/SourceMark.tsx",
        use: "Where a field's text came from, as the product's badge marks it. AI's violet badge with its sparkle is the only violet on the site; the lesson and the learner's own text are neutral. `arriving` lands it as a field fills in.",
        usage: `<SourceMark source="ai" arriving />
<SourceMark source="lesson" />`,
        frame: "piece",
        specimen: () => (
          <div className="flex flex-wrap items-center gap-3">
            <SourceMark source="ai" />
            <SourceMark source="lesson" />
            <SourceMark source="manual" />
          </div>
        ),
      },
      {
        id: "small-card",
        name: "SmallCard",
        file: "landing/SmallCard.tsx",
        use: "A card at the size of a chat reply or a tile: white and lifted, its label in the product's uppercase, then the term and its meaning. It is a list item, so put it in a `ul`, and give it motion props to land on its own beat.",
        usage: `<ul className="grid grid-cols-2 gap-2">
  <SmallCard label="Suomi · verb" term="kuulua" meaning={…} lang="fi" />
</ul>`,
        frame: "piece",
        specimen: () => (
          <ul className="grid w-full max-w-[380px] grid-cols-2 gap-2">
            <SmallCard
              label="Suomi · verb"
              term="kuulua"
              meaning="To belong; to be heard"
              lang="fi"
            />
            <SmallCard
              label="Suomi · noun"
              term="sisu"
              meaning="Grit; stubborn resolve"
              lang="fi"
            />
          </ul>
        ),
      },
      {
        id: "picker",
        name: "Picker",
        file: "landing/Picker.tsx",
        use: "The one way to switch a demo between a few things, words or names alike. One plate slides between the options. Pass `lang` when the options are words in the language being learned.",
        usage: `<Picker label={t\`Choose a word\`} options={WORDS.map((w) => w.term)} lang="et" at={at} onPick={setAt} />`,
        frame: "piece",
        specimen: () => <PickerSpecimen />,
      },
      {
        id: "word-forms",
        name: "WordForms",
        file: "landing/WordForms.tsx",
        use: "A word's three forms side by side, the part that changes lit. The language gives its words and the three slots its courses teach.",
        usage: `<WordForms lang="et" words={FORM_WORDS} slots={ESTONIAN_FORM_SLOTS} />`,
        frame: "piece",
        specimen: () => (
          <div className="w-full">
            <WordForms lang="et" words={FORM_WORDS} slots={ESTONIAN_FORM_SLOTS} />
          </div>
        ),
      },
      {
        id: "spoken-words",
        name: "SpokenWords",
        file: "landing/SpokenWords.tsx",
        use: "Words as a deck lists them, each with its meaning in this edition and its clip a tap away. Lists on one stage share one `useClipPlayer`, so a second tap stops the first clip.",
        usage: `const player = useClipPlayer("german");
<SpokenWords words={GERMAN_VERBS} locale={locale} lang="de" player={player} />`,
        frame: "piece",
        specimen: () => (
          <div className="w-full max-w-[420px] rounded-xl bg-plate p-5 edge">
            <SpokenWordsSpecimen />
          </div>
        ),
      },
      {
        id: "pick",
        name: "Pick",
        file: "landing/Pick.tsx",
        use: "A word picked out of a source, lit once it has been read.",
        usage: `<Pick on={lit(0)}>echar de menos</Pick>`,
        frame: "piece",
        specimen: () => <PickSpecimen />,
      },
    ],
  },
];

type Theme = "light" | "dark";
type Width = "wide" | "phone";

function Switch<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className="flex items-center gap-1 rounded-full bg-plate-nested p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="h-8 rounded-full px-3.5 text-sm font-medium text-ink-secondary transition-colors duration-150 hoverable:hover:text-ink aria-pressed:bg-plate aria-pressed:text-ink aria-pressed:edge"
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

/** Prose with `code` spans, as the entries write prop names. */
function Prose({ text }: { text: string }) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed sentence split once
        key={i}
        className="rounded-xs bg-plate-nested px-1 py-px font-mono text-[0.9em] text-ink"
      >
        {part}
      </code>
    ) : (
      part
    ),
  );
}

function EntryView({ entry, width }: { entry: Entry; width: Width }) {
  return (
    <article id={entry.id} aria-labelledby={`${entry.id}-name`} className="scroll-mt-24 py-12">
      <div className="mx-auto grid max-w-[1280px] gap-x-10 gap-y-4 px-5 @2xl:px-10 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 id={`${entry.id}-name`} className="text-xl font-medium tracking-[-0.02em] text-ink">
            {entry.name}
          </h3>
          <p className="mt-1 font-mono text-sm text-ink-muted">{entry.file}</p>
          <p className="mt-3 max-w-[60ch] text-md text-pretty text-ink-secondary">
            <Prose text={entry.use} />
          </p>
        </div>
        <pre className="rounded-md bg-plate-nested p-4 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-secondary">
          <code>{entry.usage}</code>
        </pre>
      </div>
      <div className="mx-auto mt-6 max-w-[1280px] px-5 @2xl:px-10">
        <div
          className={clsx(
            "@container mx-auto overflow-hidden rounded-2xl bg-canvas edge",
            width === "phone" ? "max-w-[390px]" : "w-full",
            entry.frame === "piece" && "grid min-h-40 place-items-center p-6 @2xl:p-10",
          )}
        >
          {entry.specimen()}
        </div>
      </div>
    </article>
  );
}

/** Every shared piece of the marketing site, rendered live, with how to use it. */
export function ComponentGallery() {
  const [theme, setTheme] = useState<Theme>("light");
  // The server renders light; the visitor's own theme takes over once the page runs.
  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);
  const [width, setWidth] = useState<Width>("wide");
  return (
    <div data-theme={theme} className="@container min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-edge bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-3 @2xl:px-10">
          <a href="/" className="flex items-center gap-3 rounded-xs">
            <Wordmark size={22} />
            <span className="text-md font-medium text-ink-secondary">Site components</span>
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <Switch
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
            <Switch
              label="Stage width"
              value={width}
              onChange={setWidth}
              options={[
                { value: "wide", label: "Wide" },
                { value: "phone", label: "Phone" },
              ]}
            />
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-[1280px] px-5 pt-14 pb-6 @2xl:px-10 @4xl:pt-20">
          <h1 className="max-w-[18ch] text-5xl font-medium tracking-[-0.038em] text-balance">
            The parts every lymi.app page is built from.
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg text-pretty text-ink-secondary">
            Each piece below is the real component with sample content. Build a new page from these
            before writing a section by hand, and add a piece here when a page needs a new one.
          </p>
          <nav aria-label="Contents" className="mt-10 grid gap-6 @2xl:grid-cols-2 @4xl:grid-cols-4">
            {GROUPS.map((group) => (
              <div key={group.id}>
                <a href={`#${group.id}`} className="text-md font-medium text-ink">
                  {group.name}
                </a>
                <ul className="mt-2 grid gap-1">
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <a
                        href={`#${entry.id}`}
                        className="text-sm text-ink-secondary hoverable:hover:text-ink"
                      >
                        {entry.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {GROUPS.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-title`}
            className="scroll-mt-20 border-t border-edge pt-16"
          >
            <div className="mx-auto max-w-[1280px] px-5 @2xl:px-10">
              <h2
                id={`${group.id}-title`}
                className="text-3xl font-medium tracking-[-0.03em] text-ink @2xl:text-4xl"
              >
                {group.name}
              </h2>
              <p className="mt-4 max-w-[64ch] text-md text-pretty text-ink-secondary">
                {group.intro}
              </p>
            </div>
            {group.entries.map((entry) => (
              <EntryView key={entry.id} entry={entry} width={width} />
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
