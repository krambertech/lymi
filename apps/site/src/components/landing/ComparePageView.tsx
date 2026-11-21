import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  BookOpenText,
  CalendarClock,
  Camera,
  Gamepad2,
  Gift,
  ImageIcon,
  Infinity as InfinityIcon,
  Laptop,
  Layers,
  LayoutTemplate,
  Library,
  type LucideIcon,
  Puzzle,
  Repeat,
  School,
  Sigma,
  Smartphone,
  Sparkle,
  Users,
  WifiOff,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { trayStyle } from "../../lib/tray";
import { ArrowLink } from "./ArrowLink";
import { COMPARE_PAGES, type CompareKey } from "./compare-pages";
import { CompareMark } from "./CompareMark";
import { FeatureSection, Wide } from "./FeatureSection";
import { Hero } from "./Hero";
import { type Collection, ImportDemo } from "./ImportDemo";
import { LandingLayout } from "./LandingLayout";
import { Questions } from "./Questions";
import { Section } from "./Section";
import { SignUpSection } from "./SignUpSection";
import { type Step, Steps } from "./Steps";

/** Which app does more on a row of the table, or neither. */
type Ahead = "lymi" | "other" | "same";

interface Row {
  id: string;
  label: ReactNode;
  lymi: ReactNode;
  other: ReactNode;
  ahead: Ahead;
}

interface Point {
  id: string;
  icon: LucideIcon;
  title: ReactNode;
  body: ReactNode;
}

/** Everything that differs between the pages. */
interface Content {
  lede: ReactNode;
  changes: { body: ReactNode; points: readonly Point[] };
  rows: readonly Row[];
  stay: { body: ReactNode; points: readonly Point[]; after: ReactNode };
  /** Moving over: the import preview when the history comes across, the steps when it doesn't. */
  move: { title: ReactNode; body: ReactNode } & (
    | { collection: Collection }
    | { steps: readonly Step[] }
  );
  signUp: ReactNode;
}

function useContent(key: CompareKey): Content {
  switch (key) {
    case "anki":
      return {
        lede: (
          <Trans>
            Both schedule reviews with FSRS. Anki lets you shape every detail of a card. Lymi takes
            most of the work out of making one.
          </Trans>
        ),
        changes: {
          body: (
            <Trans>
              Anki is a tool you set up. Lymi does more of the work around the review, so your time
              goes into remembering.
            </Trans>
          ),
          points: [
            {
              id: "ai",
              icon: Sparkle,
              title: <Trans>AI fills what you leave empty</Trans>,
              body: (
                <Trans>
                  Type a word. Lymi adds a meaning, an example and audio in your deck’s style, and
                  marks every field it wrote so you can check it.
                </Trans>
              ),
            },
            {
              id: "notes",
              icon: Camera,
              title: <Trans>Cards from your notes</Trans>,
              body: (
                <Trans>
                  Snap a page of notes or add a PDF. Smart add picks out the cards and you tick the
                  ones to keep. Claude or ChatGPT can add cards too.
                </Trans>
              ),
            },
            {
              id: "devices",
              icon: Laptop,
              title: <Trans>Free on every device</Trans>,
              body: (
                <Trans>
                  The same cards in the iPhone and Android apps, on your computer and in the Mac
                  app, synced, with nothing to buy.
                </Trans>
              ),
            },
            {
              id: "together",
              icon: Users,
              title: <Trans>One deck for a whole class</Trans>,
              body: (
                <Trans>
                  Share a deck with a link. Everyone reviews on their own schedule, and when you fix
                  a card, it’s fixed for all of them.
                </Trans>
              ),
            },
          ],
        },
        rows: [
          {
            id: "adding",
            label: <Trans>Adding a card</Trans>,
            lymi: <Trans>Type the word; AI fills the rest and marks it</Trans>,
            other: <Trans>Fill in each field yourself</Trans>,
            ahead: "lymi",
          },
          {
            id: "notes",
            label: <Trans>Cards from notes or a PDF</Trans>,
            lymi: <Trans>Built in, with Smart add</Trans>,
            other: <Trans>Through add-ons</Trans>,
            ahead: "lymi",
          },
          {
            id: "assistants",
            label: <Trans>AI assistants</Trans>,
            lymi: <Trans>Claude, ChatGPT, Gemini and Grok add cards</Trans>,
            other: <Trans>Through add-ons</Trans>,
            ahead: "lymi",
          },
          {
            id: "iphone",
            label: <Trans>On iPhone</Trans>,
            lymi: <Trans>Free, as an app or in the browser</Trans>,
            other: <Trans>AnkiMobile, a one-off €29.99 ($24.99 in the US)</Trans>,
            ahead: "lymi",
          },
          {
            id: "together",
            label: <Trans>Studying with others</Trans>,
            lymi: <Trans>One shared deck, everyone on their own schedule</Trans>,
            other: <Trans>A copy each, or AnkiHub for decks that update</Trans>,
            ahead: "lymi",
          },
          {
            id: "templates",
            label: <Trans>Card design</Trans>,
            lymi: <Trans>Set fields, plain text</Trans>,
            other: <Trans>Your own HTML and CSS templates</Trans>,
            ahead: "other",
          },
          {
            id: "occlusion",
            label: <Trans>Image occlusion</Trans>,
            lymi: <Trans>Not yet</Trans>,
            other: <Trans>Built in</Trans>,
            ahead: "other",
          },
          {
            id: "addons",
            label: <Trans>Add-ons</Trans>,
            lymi: <Trans>None</Trans>,
            other: <Trans>About 3,900, on the computer</Trans>,
            ahead: "other",
          },
          {
            id: "library",
            label: <Trans>Shared decks</Trans>,
            lymi: <Trans>A smaller, checked library</Trans>,
            other: <Trans>Thousands on AnkiWeb</Trans>,
            ahead: "other",
          },
          {
            id: "offline",
            label: <Trans>Offline</Trans>,
            lymi: <Trans>Reviews offline and syncs when back online</Trans>,
            other: <Trans>Fully offline on every device</Trans>,
            ahead: "other",
          },
          {
            id: "code",
            label: <Trans>Source code</Trans>,
            lymi: <Trans>Public, MIT after two years</Trans>,
            other: <Trans>Open source</Trans>,
            ahead: "other",
          },
          {
            id: "scheduler",
            label: <Trans>Scheduling</Trans>,
            lymi: <Trans>FSRS, on from the start</Trans>,
            other: <Trans>FSRS, once you switch it on in deck options</Trans>,
            ahead: "same",
          },
          {
            id: "sync",
            label: <Trans>Sync</Trans>,
            lymi: <Trans>Free, nothing to set up</Trans>,
            other: <Trans>Free, with an AnkiWeb account</Trans>,
            ahead: "same",
          },
          {
            id: "leaving",
            label: <Trans>Leaving</Trans>,
            lymi: <Trans>Export an Anki package any time</Trans>,
            other: <Trans>Export a package any time</Trans>,
            ahead: "same",
          },
        ],
        stay: {
          body: (
            <Trans>
              Lymi isn’t for everyone who uses Anki. If one of these is you, Anki will serve you
              better.
            </Trans>
          ),
          points: [
            {
              id: "addons",
              icon: Puzzle,
              title: <Trans>You rely on add-ons</Trans>,
              body: (
                <Trans>
                  Heatmaps, custom review screens, tools that talk to AnkiConnect beyond Yomitan.
                  Lymi has no add-ons.
                </Trans>
              ),
            },
            {
              id: "templates",
              icon: LayoutTemplate,
              title: <Trans>You design your own cards</Trans>,
              body: (
                <Trans>
                  HTML and CSS templates, image occlusion, many fields laid out your way. Lymi’s
                  cards have set fields and plain text.
                </Trans>
              ),
            },
            {
              id: "local",
              icon: WifiOff,
              title: <Trans>You want everything on your own computer</Trans>,
              body: (
                <Trans>
                  Anki keeps your whole collection on your device and never needs the internet. Lymi
                  keeps your cards on its servers.
                </Trans>
              ),
            },
            {
              id: "deck",
              icon: Library,
              title: <Trans>Your course runs on a big shared deck</Trans>,
              body: (
                <Trans>
                  If your class deck updates through AnkiHub, as AnKing does for medical students,
                  stay where the deck lives.
                </Trans>
              ),
            },
          ],
          after: (
            <Trans>
              Not sure? Import a copy and try both. Your Anki collection stays exactly as it is.
            </Trans>
          ),
        },
        move: {
          title: <Trans>Bring your decks over</Trans>,
          body: (
            <Trans>
              Export a package from Anki and import it into Lymi. Cards arrive with their history
              and due dates, and the preview counts anything that stays behind.
            </Trans>
          ),
          collection: {
            app: "Anki",
            fileName: "Spanish.apkg",
            megabytes: 14,
            cards: 1240,
            reviews: 16402,
            decks: 4,
            pictures: 180,
          },
        },
        signUp: <Trans>Bring your Anki decks and keep going.</Trans>,
      };
    case "mochi":
      return {
        lede: (
          <Trans>
            Both are calm, keyboard-friendly flashcard apps. Mochi keeps your notes and cards
            together in Markdown. Lymi does more of the card-making for you, and syncs for free.
          </Trans>
        ),
        changes: {
          body: (
            <Trans>
              Mochi gives you a notebook to build cards in. Lymi starts from the word and fills in
              the rest.
            </Trans>
          ),
          points: [
            {
              id: "ai",
              icon: Sparkle,
              title: <Trans>AI fills what you leave empty</Trans>,
              body: (
                <Trans>
                  Type a word. Lymi adds a meaning, an example and audio in your deck’s style, and
                  marks every field it wrote so you can check it.
                </Trans>
              ),
            },
            {
              id: "sync",
              icon: Laptop,
              title: <Trans>Sync is free</Trans>,
              body: (
                <Trans>
                  Your phone, your browser and the Mac app share the same cards and progress,
                  without a paid plan.
                </Trans>
              ),
            },
            {
              id: "assistants",
              icon: Camera,
              title: <Trans>Cards from your notes and your AI</Trans>,
              body: (
                <Trans>
                  Snap a page of notes or add a PDF and Smart add picks out the cards. Claude,
                  ChatGPT, Gemini and Grok can add cards to your decks too.
                </Trans>
              ),
            },
            {
              id: "together",
              icon: Users,
              title: <Trans>One deck for a whole class</Trans>,
              body: (
                <Trans>
                  Share a deck with a link. Everyone reviews on their own schedule, and when you fix
                  a card, it’s fixed for all of them.
                </Trans>
              ),
            },
          ],
        },
        rows: [
          {
            id: "sync",
            label: <Trans>Sync between devices</Trans>,
            lymi: <Trans>Free</Trans>,
            other: <Trans>With Pro, from $5 a month</Trans>,
            ahead: "lymi",
          },
          {
            id: "ai",
            label: <Trans>AI filling in cards</Trans>,
            lymi: <Trans>Built in and free, marked where AI wrote it</Trans>,
            other: <Trans>Template fields, with small monthly limits on Free</Trans>,
            ahead: "lymi",
          },
          {
            id: "assistants",
            label: <Trans>AI assistants</Trans>,
            lymi: <Trans>Claude, ChatGPT, Gemini and Grok add cards</Trans>,
            other: <Trans>Not built in</Trans>,
            ahead: "lymi",
          },
          {
            id: "grades",
            label: <Trans>Grading a card</Trans>,
            lymi: <Trans>Forgot, Hard, Good or Easy</Trans>,
            other: <Trans>Remembered or Forgot</Trans>,
            ahead: "lymi",
          },
          {
            id: "together",
            label: <Trans>Studying with others</Trans>,
            lymi: <Trans>One shared deck, everyone on their own schedule</Trans>,
            other: <Trans>Publish a read-only copy, with Pro</Trans>,
            ahead: "lymi",
          },
          {
            id: "api",
            label: <Trans>API</Trans>,
            lymi: <Trans>Free, with a key from Settings</Trans>,
            other: <Trans>With Pro</Trans>,
            ahead: "lymi",
          },
          {
            id: "notes",
            label: <Trans>Notes</Trans>,
            lymi: <Trans>A notes field on each card</Trans>,
            other: <Trans>Markdown notes with links, beside your cards</Trans>,
            ahead: "other",
          },
          {
            id: "templates",
            label: <Trans>Card design</Trans>,
            lymi: <Trans>Set fields, plain text</Trans>,
            other: <Trans>Your own templates, with maths and drawings</Trans>,
            ahead: "other",
          },
          {
            id: "local",
            label: <Trans>Account</Trans>,
            lymi: <Trans>Needed; your cards live on Lymi’s servers</Trans>,
            other: <Trans>Not needed; your cards stay on your device</Trans>,
            ahead: "other",
          },
          {
            id: "desktop",
            label: <Trans>Desktop apps</Trans>,
            lymi: <Trans>Mac, and the browser anywhere</Trans>,
            other: <Trans>Mac, Windows and Linux</Trans>,
            ahead: "other",
          },
          {
            id: "scheduler",
            label: <Trans>Scheduling</Trans>,
            lymi: <Trans>FSRS, on from the start</Trans>,
            other: <Trans>Its own algorithm, or FSRS in Settings</Trans>,
            ahead: "same",
          },
          {
            id: "price",
            label: <Trans>Studying on one device</Trans>,
            lymi: <Trans>Free</Trans>,
            other: <Trans>Free</Trans>,
            ahead: "same",
          },
          {
            id: "leaving",
            label: <Trans>Leaving</Trans>,
            lymi: <Trans>Export an Anki package or a Lymi file</Trans>,
            other: <Trans>Export a Mochi file, Markdown or CSV</Trans>,
            ahead: "same",
          },
        ],
        stay: {
          body: (
            <Trans>
              Lymi isn’t for everyone who uses Mochi. If one of these is you, Mochi will serve you
              better.
            </Trans>
          ),
          points: [
            {
              id: "notes",
              icon: BookOpenText,
              title: <Trans>Your notes and cards live together</Trans>,
              body: (
                <Trans>
                  Mochi is a notebook with linked Markdown notes. Lymi is for cards; a note sits on
                  the card it belongs to.
                </Trans>
              ),
            },
            {
              id: "local",
              icon: WifiOff,
              title: <Trans>You don’t want an account</Trans>,
              body: (
                <Trans>
                  Mochi works on your device without signing up. Lymi needs an account and keeps
                  your cards on its servers.
                </Trans>
              ),
            },
            {
              id: "templates",
              icon: LayoutTemplate,
              title: <Trans>You build your own card layouts</Trans>,
              body: (
                <Trans>
                  Templates with conditional fields, maths and drawing. Lymi’s cards have set fields
                  and plain text.
                </Trans>
              ),
            },
            {
              id: "desktop",
              icon: Laptop,
              title: <Trans>You want a desktop app on Windows or Linux</Trans>,
              body: (
                <Trans>Lymi runs in the browser there; its desktop app is for the Mac only.</Trans>
              ),
            },
          ],
          after: (
            <Trans>
              Not sure? Import a copy and try both. Your Mochi decks stay exactly as they are.
            </Trans>
          ),
        },
        move: {
          title: <Trans>Bring your decks over</Trans>,
          body: (
            <Trans>
              Export your decks from Mochi as a Mochi file and import it into Lymi. Cards arrive
              with their review history and due dates, and the preview counts anything that stays
              behind.
            </Trans>
          ),
          collection: {
            app: "Mochi",
            fileName: "Japanese.mochi",
            megabytes: 9,
            cards: 860,
            reviews: 9120,
            decks: 3,
            pictures: 40,
          },
        },
        signUp: <Trans>Bring your Mochi decks and keep going.</Trans>,
      };
    case "quizlet":
      return {
        lede: (
          <Trans>
            Quizlet is built for getting through a set before a test. Lymi is built for keeping it
            afterwards: spaced repetition brings back the cards you forget sooner and the ones you
            know later and later.
          </Trans>
        ),
        changes: {
          body: (
            <Trans>
              In Quizlet you choose a set and a study mode. In Lymi you open Today, and spaced
              repetition has already picked the cards that need you.
            </Trans>
          ),
          points: [
            {
              id: "schedule",
              icon: Repeat,
              title: <Trans>A schedule for every card</Trans>,
              body: (
                <Trans>
                  FSRS schedules every card on your phone and your computer. Cards you remember wait
                  longer each time, and the ones you forget come back sooner.
                </Trans>
              ),
            },
            {
              id: "free",
              icon: Gift,
              title: <Trans>Nothing behind a paywall</Trans>,
              body: (
                <Trans>
                  Review as much as you like, use your own pictures and turn notes into cards
                  without a subscription or ads.
                </Trans>
              ),
            },
            {
              id: "ai",
              icon: Sparkle,
              title: <Trans>AI fills what you leave empty</Trans>,
              body: (
                <Trans>
                  Type a word. Lymi adds a meaning, an example and audio, and marks every field it
                  wrote so you can check it.
                </Trans>
              ),
            },
            {
              id: "cards",
              icon: Layers,
              title: <Trans>More on a card than two sides</Trans>,
              body: (
                <Trans>
                  A term and its meaning, an example with its translation, a hint, a picture and a
                  recording, each in its own field.
                </Trans>
              ),
            },
          ],
        },
        rows: [
          {
            id: "schedule",
            label: <Trans>Spaced repetition</Trans>,
            lymi: <Trans>FSRS for every card, on every device</Trans>,
            other: <Trans>An option in Flashcards, on the web</Trans>,
            ahead: "lymi",
          },
          {
            id: "modes",
            label: <Trans>Studying without paying</Trans>,
            lymi: <Trans>Everything, as much as you like</Trans>,
            other: (
              <Trans>
                Learn and Test capped on Free and Plus; unlimited with Plus Unlimited, €44.99 a year
              </Trans>
            ),
            ahead: "lymi",
          },
          {
            id: "ads",
            label: <Trans>Ads</Trans>,
            lymi: <Trans>None</Trans>,
            other: <Trans>On the free plan</Trans>,
            ahead: "lymi",
          },
          {
            id: "pictures",
            label: <Trans>Your own pictures</Trans>,
            lymi: <Trans>Free</Trans>,
            other: <Trans>With Plus</Trans>,
            ahead: "lymi",
          },
          {
            id: "fields",
            label: <Trans>What a card holds</Trans>,
            lymi: <Trans>Meaning, example, hint, picture and audio</Trans>,
            other: <Trans>A term and a definition</Trans>,
            ahead: "lymi",
          },
          {
            id: "assistants",
            label: <Trans>AI assistants</Trans>,
            lymi: <Trans>Claude, ChatGPT, Gemini and Grok add cards</Trans>,
            other: <Trans>An app in ChatGPT</Trans>,
            ahead: "lymi",
          },
          {
            id: "games",
            label: <Trans>Games</Trans>,
            lymi: <Trans>None</Trans>,
            other: <Trans>Match, Blast and Quizlet Live</Trans>,
            ahead: "other",
          },
          {
            id: "library",
            label: <Trans>Ready-made sets</Trans>,
            lymi: <Trans>A smaller, checked library</Trans>,
            other: <Trans>Hundreds of millions</Trans>,
            ahead: "other",
          },
          {
            id: "class",
            label: <Trans>Classroom tools</Trans>,
            lymi: <Trans>Shared decks with a join link</Trans>,
            other: <Trans>Classes, live games and a free year of Plus for teachers</Trans>,
            ahead: "other",
          },
          {
            id: "tests",
            label: <Trans>Practice tests</Trans>,
            lymi: <Trans>None</Trans>,
            other: <Trans>Tests made from your set</Trans>,
            ahead: "other",
          },
          {
            id: "phone",
            label: <Trans>On your phone</Trans>,
            lymi: <Trans>Apps for iPhone and Android</Trans>,
            other: <Trans>Apps for iPhone and Android</Trans>,
            ahead: "same",
          },
          {
            id: "notes",
            label: <Trans>Cards from notes and files</Trans>,
            lymi: <Trans>Smart add, from a photo, a PDF or text</Trans>,
            other: <Trans>Study Guides, limited without Plus</Trans>,
            ahead: "same",
          },
          {
            id: "leaving",
            label: <Trans>Leaving</Trans>,
            lymi: <Trans>Export an Anki package, a Lymi file or a spreadsheet</Trans>,
            other: <Trans>Copy the text of a set you made</Trans>,
            ahead: "same",
          },
        ],
        stay: {
          body: (
            <Trans>
              Lymi isn’t for everyone who uses Quizlet. If one of these is you, Quizlet will serve
              you better.
            </Trans>
          ),
          points: [
            {
              id: "games",
              icon: Gamepad2,
              title: <Trans>You learn best with games</Trans>,
              body: (
                <Trans>
                  Match, Blast and Quizlet Live turn a set into a race. Lymi shows one card at a
                  time and nothing else.
                </Trans>
              ),
            },
            {
              id: "class",
              icon: School,
              title: <Trans>Your class runs on Quizlet</Trans>,
              body: (
                <Trans>
                  If your teacher assigns sets and runs Quizlet Live in class, stay where the class
                  is.
                </Trans>
              ),
            },
            {
              id: "library",
              icon: Library,
              title: <Trans>You need a set for everything</Trans>,
              body: (
                <Trans>
                  Quizlet has a ready-made set for almost any textbook. Lymi’s library is smaller,
                  so you’ll make more of your own cards.
                </Trans>
              ),
            },
            {
              id: "cram",
              icon: CalendarClock,
              title: <Trans>You study for one test, then move on</Trans>,
              body: (
                <Trans>
                  Spaced repetition pays off over weeks. For a test on Friday, Quizlet’s practice
                  tests fit better.
                </Trans>
              ),
            },
          ],
          after: (
            <Trans>
              Not sure? Copy a set into Lymi and try both. Your Quizlet sets stay exactly as they
              are.
            </Trans>
          ),
        },
        move: {
          title: <Trans>Bring your sets over</Trans>,
          body: (
            <Trans>
              Quizlet exports sets you made as text. Pictures, audio and progress stay behind, so
              the cards start as new.
            </Trans>
          ),
          steps: [
            {
              id: "copy",
              title: <Trans>Copy your set</Trans>,
              body: (
                <Trans>
                  On quizlet.com, open your set, choose Export from its … menu and press Copy text.
                </Trans>
              ),
            },
            {
              id: "paste",
              title: <Trans>Paste it into Lymi</Trans>,
              body: (
                <Trans>
                  Open Settings, then Import, then Quizlet, and paste. The preview shows each card
                  before anything is added.
                </Trans>
              ),
            },
            {
              id: "review",
              title: <Trans>Start reviewing</Trans>,
              body: (
                <Trans>
                  Your first answers tell Lymi what you already know, and it spaces those cards out
                  from there.
                </Trans>
              ),
            },
          ],
        },
        signUp: <Trans>Bring your Quizlet sets and remember them for good.</Trans>,
      };
    case "noji":
      return {
        lede: (
          <Trans>
            Noji, once called AnkiPro, is a polished phone app with a big deck library. Lymi has no
            daily limit, schedules with FSRS and keeps its AI free.
          </Trans>
        ),
        changes: {
          body: (
            <Trans>Most of what Noji keeps for Premium, Lymi gives you on the free plan.</Trans>
          ),
          points: [
            {
              id: "limit",
              icon: InfinityIcon,
              title: <Trans>No daily limit</Trans>,
              body: (
                <Trans>
                  Review every card that’s due, however many there are. Noji’s free plan stops at 50
                  a day.
                </Trans>
              ),
            },
            {
              id: "ai",
              icon: Sparkle,
              title: <Trans>AI without a subscription</Trans>,
              body: (
                <Trans>
                  Type a word and Lymi fills in a meaning, an example and audio, or snap a page of
                  notes and Smart add picks out the cards. Every field AI wrote is marked.
                </Trans>
              ),
            },
            {
              id: "devices",
              icon: Laptop,
              title: <Trans>Your computer too</Trans>,
              body: (
                <Trans>
                  The same cards on your phone, in the browser and in the Mac app, with offline
                  review on the free plan.
                </Trans>
              ),
            },
            {
              id: "assistants",
              icon: Users,
              title: <Trans>Your AI assistant adds cards</Trans>,
              body: (
                <Trans>
                  Ask Claude, ChatGPT, Gemini or Grok to turn a lesson into cards, and they land in
                  your Lymi decks.
                </Trans>
              ),
            },
          ],
        },
        rows: [
          {
            id: "limit",
            label: <Trans>Cards a day on the free plan</Trans>,
            lymi: <Trans>No limit</Trans>,
            other: <Trans>50</Trans>,
            ahead: "lymi",
          },
          {
            id: "ai",
            label: <Trans>Making cards with AI</Trans>,
            lymi: <Trans>Free</Trans>,
            other: <Trans>With Premium</Trans>,
            ahead: "lymi",
          },
          {
            id: "media",
            label: <Trans>Pictures and audio</Trans>,
            lymi: <Trans>Free</Trans>,
            other: <Trans>With Premium</Trans>,
            ahead: "lymi",
          },
          {
            id: "offline",
            label: <Trans>Offline review</Trans>,
            lymi: <Trans>Free</Trans>,
            other: <Trans>With Premium</Trans>,
            ahead: "lymi",
          },
          {
            id: "scheduler",
            label: <Trans>Scheduling</Trans>,
            lymi: <Trans>FSRS, explained in the docs</Trans>,
            other: <Trans>Presets; the method isn’t named</Trans>,
            ahead: "lymi",
          },
          {
            id: "assistants",
            label: <Trans>AI assistants</Trans>,
            lymi: <Trans>Claude, ChatGPT, Gemini and Grok add cards</Trans>,
            other: <Trans>Not built in</Trans>,
            ahead: "lymi",
          },
          {
            id: "phone",
            label: <Trans>On your phone</Trans>,
            lymi: <Trans>New apps for iPhone and Android</Trans>,
            other: <Trans>Highly rated iPhone and Android apps</Trans>,
            ahead: "other",
          },
          {
            id: "library",
            label: <Trans>Ready-made decks</Trans>,
            lymi: <Trans>A smaller, checked library</Trans>,
            other: <Trans>More than 50,000</Trans>,
            ahead: "other",
          },
          {
            id: "occlusion",
            label: <Trans>Image occlusion</Trans>,
            lymi: <Trans>Not yet</Trans>,
            other: <Trans>With masks drawn for you, on Premium</Trans>,
            ahead: "other",
          },
          {
            id: "format",
            label: <Trans>Maths and code</Trans>,
            lymi: <Trans>Plain text</Trans>,
            other: <Trans>LaTeX and code blocks</Trans>,
            ahead: "other",
          },
          {
            id: "desktop",
            label: <Trans>On the computer</Trans>,
            lymi: <Trans>The browser, and a Mac app</Trans>,
            other: <Trans>The browser</Trans>,
            ahead: "same",
          },
          {
            id: "sharing",
            label: <Trans>Sharing a deck</Trans>,
            lymi: <Trans>A link; everyone keeps their own schedule</Trans>,
            other: <Trans>A link, with viewers and editors</Trans>,
            ahead: "same",
          },
          {
            id: "leaving",
            label: <Trans>Leaving</Trans>,
            lymi: <Trans>Export an Anki package or a Lymi file</Trans>,
            other: <Trans>Export a CSV or an OFC file</Trans>,
            ahead: "same",
          },
        ],
        stay: {
          body: (
            <Trans>
              Lymi isn’t for everyone who uses Noji. If one of these is you, Noji will serve you
              better.
            </Trans>
          ),
          points: [
            {
              id: "phone",
              icon: Smartphone,
              title: <Trans>You want a proven phone app</Trans>,
              body: (
                <Trans>
                  Noji’s iPhone and Android apps are polished and well rated. Lymi’s phone apps came
                  out in November 2026.
                </Trans>
              ),
            },
            {
              id: "library",
              icon: Library,
              title: <Trans>You study from its library</Trans>,
              body: (
                <Trans>
                  More than 50,000 ready-made decks. Lymi’s library is smaller, so you’ll make more
                  of your own cards.
                </Trans>
              ),
            },
            {
              id: "occlusion",
              icon: ImageIcon,
              title: <Trans>You learn from labelled pictures</Trans>,
              body: (
                <Trans>
                  Anatomy, maps and diagrams with parts hidden. Lymi can’t ask image occlusion cards
                  yet.
                </Trans>
              ),
            },
            {
              id: "format",
              icon: Sigma,
              title: <Trans>Your cards need maths or code</Trans>,
              body: <Trans>Noji renders LaTeX and code blocks. Lymi’s cards are plain text.</Trans>,
            },
          ],
          after: (
            <Trans>
              Not sure? Import a copy and try both. Your Noji decks stay exactly as they are.
            </Trans>
          ),
        },
        move: {
          title: <Trans>Bring your decks over</Trans>,
          body: (
            <Trans>
              Cards you’ve learned in Noji keep their due dates. Noji’s file says where each card
              stands today, not when you reviewed it, so past reviews stay behind.
            </Trans>
          ),
          steps: [
            {
              id: "export",
              title: <Trans>Export from Noji</Trans>,
              body: (
                <Trans>
                  Open the deck’s Settings, choose Export deck, pick OFC and include your learning
                  progress. Noji emails you the file.
                </Trans>
              ),
            },
            {
              id: "import",
              title: <Trans>Import into Lymi</Trans>,
              body: (
                <Trans>
                  Open Settings, then Import, then Noji, and choose the file. The preview shows what
                  comes across before anything is added.
                </Trans>
              ),
            },
            {
              id: "review",
              title: <Trans>Pick up where you were</Trans>,
              body: (
                <Trans>
                  Cards you know come in as Known with their due dates; cards you were still
                  learning start as new.
                </Trans>
              ),
            },
          ],
        },
        signUp: <Trans>Bring your Noji decks, without a daily limit.</Trans>,
      };
  }
}

function PointList({ points, iconClass }: { points: readonly Point[]; iconClass: string }) {
  return (
    <ul className="mt-12 grid gap-x-12 gap-y-10 @2xl:grid-cols-2">
      {points.map(({ id, icon: Icon, title, body }) => (
        <li key={id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
          <Icon aria-hidden="true" strokeWidth={1.5} className={clsx("mt-0.5 size-6", iconClass)} />
          <div>
            <h3 className="text-lg font-medium tracking-[-0.02em] text-ink">{title}</h3>
            <p className="mt-1.5 max-w-[44ch] text-base text-pretty text-ink-secondary">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const GROUPS: readonly Ahead[] = ["lymi", "other", "same"];

/** The import preview's tray: the warm side of the site's tray hues, away from every other app's colour. */
const IMPORT_HUE = 25;

function GroupTitle({ ahead, name }: { ahead: Ahead; name: string }) {
  switch (ahead) {
    case "lymi":
      return <Trans>Where Lymi does more</Trans>;
    case "other":
      return <Trans>Where {name} does more</Trans>;
    case "same":
      return <Trans>The same in both</Trans>;
  }
}

/**
 * Every row under the app that does more, the other app's strengths in a group of their own. On a
 * phone each row stacks, with the two answers side by side under its name.
 */
function ComparisonTable({ rows, name }: { rows: readonly Row[]; name: string }) {
  const groups = GROUPS.map((ahead) => ({
    ahead,
    rows: rows.filter((row) => row.ahead === ahead),
  }));
  return (
    <div className="mt-10 overflow-hidden rounded-2xl bg-plate edge">
      <div className="@2xl:hidden">
        {groups.map((group) => (
          <div key={group.ahead}>
            <h3 className="bg-plate-nested px-4 py-2.5 text-sm font-medium text-ink-secondary">
              <GroupTitle ahead={group.ahead} name={name} />
            </h3>
            <ul className="divide-y divide-edge">
              {group.rows.map((row) => (
                <li key={row.id} className="px-4 py-4">
                  <p className="text-md font-medium text-ink">{row.label}</p>
                  <dl className="mt-2 grid grid-cols-2 grid-rows-[auto_auto] gap-x-4 gap-y-1">
                    <dt className="text-xs text-ink-muted">Lymi</dt>
                    <dd className="row-start-2 text-sm text-pretty text-ink-secondary">
                      {row.lymi}
                    </dd>
                    <dt className="text-xs text-ink-muted">{name}</dt>
                    <dd className="row-start-2 text-sm text-pretty text-ink-secondary">
                      {row.other}
                    </dd>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <table className="hidden w-full border-collapse text-start @2xl:table">
        <thead>
          <tr className="border-b border-edge">
            <th
              scope="col"
              className="w-[26%] px-5 py-3 text-start text-sm font-medium text-ink-muted"
            >
              <span className="sr-only">
                <Trans>What you compare</Trans>
              </span>
            </th>
            <th scope="col" className="px-5 py-3 text-start text-sm font-medium text-ink">
              Lymi
            </th>
            <th scope="col" className="px-5 py-3 text-start text-sm font-medium text-ink">
              {name}
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.ahead}>
            <tr>
              <th
                colSpan={3}
                scope="rowgroup"
                className="bg-plate-nested px-5 py-2.5 text-start text-sm font-medium text-ink-secondary"
              >
                <GroupTitle ahead={group.ahead} name={name} />
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.id} className="border-b border-edge last:border-b-0">
                <th
                  scope="row"
                  className="px-5 py-4 text-start align-top text-md font-medium text-ink"
                >
                  {row.label}
                </th>
                <td
                  className={clsx(
                    "px-5 py-4 align-top text-md text-pretty",
                    group.ahead === "lymi" ? "text-ink" : "text-ink-secondary",
                  )}
                >
                  {row.lymi}
                </td>
                <td
                  className={clsx(
                    "px-5 py-4 align-top text-md text-pretty",
                    group.ahead === "other" ? "text-ink" : "text-ink-secondary",
                  )}
                >
                  {row.other}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function Checked({ compare }: { compare: CompareKey }) {
  const { i18n } = useLingui();
  const { checked, sources } = COMPARE_PAGES[compare];
  const date = i18n.date(new Date(`${checked}T12:00:00Z`), { dateStyle: "long" });
  const list = new Intl.ListFormat(i18n.locale, { type: "conjunction" }).formatToParts(
    sources.map((source) =>
      typeof source.label === "string" ? source.label : i18n._(source.label),
    ),
  );
  let index = 0;
  const places = list.map((part) =>
    part.type === "element" ? (
      <a
        key={part.value}
        href={sources[index++]?.href}
        rel="noopener"
        className="underline underline-offset-2 hoverable:hover:text-ink"
      >
        {part.value}
      </a>
    ) : (
      part.value
    ),
  );
  return (
    <p className="mt-4 text-sm text-ink-muted">
      <Trans>
        Checked on {date} against {places}.
      </Trans>
    </p>
  );
}

function CompareHero({ compare }: { compare: CompareKey }) {
  const { t } = useLingui();
  const { name, icon, guide } = COMPARE_PAGES[compare];
  const content = useContent(compare);
  return (
    <Hero visualWidth={460}>
      <Hero.Copy>
        <Hero.Title size="page">
          <Trans>Lymi vs {name}</Trans>
        </Hero.Title>
        <Hero.Lede>{content.lede}</Hero.Lede>
        <Hero.Actions secondary={{ href: guide, label: <Trans>How the import works</Trans> }} />
      </Hero.Copy>
      <Hero.Visual>
        <CompareMark icon={icon} label={t`The ${name} app icon behind Lymi’s`} />
      </Hero.Visual>
    </Hero>
  );
}

/** The light behind the nav and the hero, in the other app's colour and Lymi's. */
function CompareWash({ hue }: { hue: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ "--wash-h": hue } as CSSProperties}
      className="compare-wash pointer-events-none absolute inset-0 -z-10"
    />
  );
}

/** A page for people who already use another flashcard app: how the two compare, honestly. */
export function ComparePageView({ compare }: { compare: CompareKey }) {
  const page = COMPARE_PAGES[compare];
  const { name, hue, guide } = page;
  const content = useContent(compare);
  const guideLink = (
    <ArrowLink href={guide}>
      <Trans>Moving from {name}, step by step</Trans>
    </ArrowLink>
  );

  return (
    <LandingLayout
      page={page.page}
      hero={<CompareHero compare={compare} />}
      backdrop={<CompareWash hue={hue} />}
    >
      <Wide title={<Trans>What you get with Lymi</Trans>} body={content.changes.body}>
        <PointList points={content.changes.points} iconClass="text-amber-text" />
      </Wide>

      <Section>
        <Section.Header>
          <Section.Title>
            <Trans>Side by side</Trans>
          </Section.Title>
          <Section.Body>
            <Trans>
              Where each app does more, including the rows where it’s {name}. We check these against{" "}
              {name}’s own pages and update them when either app changes.
            </Trans>
          </Section.Body>
        </Section.Header>
        <ComparisonTable rows={content.rows} name={name} />
        <Checked compare={compare} />
      </Section>

      <Section>
        <div style={trayStyle(hue)} className="use-case-tile rounded-[24px] p-7 @2xl:p-10">
          <Section.Header>
            <Section.Title>
              <Trans>Stay with {name} if…</Trans>
            </Section.Title>
            <Section.Body>{content.stay.body}</Section.Body>
          </Section.Header>
          <PointList points={content.stay.points} iconClass="text-ink-secondary" />
          <p className="mt-10 max-w-[60ch] text-md text-pretty text-ink-secondary">
            {content.stay.after}
          </p>
        </div>
      </Section>

      {"collection" in content.move ? (
        <FeatureSection title={content.move.title} body={content.move.body} after={guideLink}>
          <div
            style={trayStyle(IMPORT_HUE)}
            className="use-case-tile grid place-items-center rounded-[24px] px-5 py-10 @2xl:px-10 @2xl:py-14"
          >
            <ImportDemo collection={content.move.collection} />
          </div>
        </FeatureSection>
      ) : (
        <Wide title={content.move.title} body={content.move.body} action={guideLink}>
          <div className="mt-10">
            <Steps steps={content.move.steps} />
          </div>
        </Wide>
      )}

      <Questions title={<Trans>Questions from {name} users</Trans>} items={page.questions} />

      <SignUpSection title={content.signUp} />
    </LandingLayout>
  );
}
