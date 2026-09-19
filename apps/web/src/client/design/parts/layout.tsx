import { MoreHorizontal, Plus, Search } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button, IconButton } from "../../components/button";
import { Screen, ScreenBar } from "../../components/layout/screen";
import { ShellChrome } from "../../components/layout/shell-chrome";
import { PillNav } from "../../components/pill-nav";
import { Input } from "../../components/ui/input";
import { Sidebar } from "../../views/shell";
import { designChrome } from "../chrome";
import { DeviceFrames } from "../device-frame";
import { Desktop, type FrameTheme, Phone, Variants } from "../frame";
import { WORDS, type Word, WordPlace, WordRows } from "../layout-scenes";
import { decks, me } from "../mock";
import { type Group, noop } from "./types";

function OnPhone({
  theme,
  path,
  children,
}: {
  theme: FrameTheme;
  path: string;
  children: ReactNode;
}) {
  return (
    <ShellChrome value={designChrome(path)}>
      <Phone
        theme={theme}
        className="h-[620px]"
        bottom={
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-6">
            <PillNav static={{ path }} />
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </Phone>
    </ShellChrome>
  );
}

function OnDesktop({
  theme,
  path,
  children,
  aside,
}: {
  theme: FrameTheme;
  path: string;
  children: ReactNode;
  aside?: ReactNode | undefined;
}) {
  return (
    <ShellChrome value={designChrome(path)}>
      <Desktop theme={theme} height={520}>
        <Sidebar
          decks={decks}
          name={me.name}
          docsUrl="https://lymi.app/docs"
          onAdd={noop}
          static={{ path }}
        />
        <main className="@container flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
        {aside}
      </Desktop>
    </ShellChrome>
  );
}

const Lines = () => (
  <div className="grid gap-2" aria-hidden="true">
    <div className="edge h-20 rounded-xl bg-plate" />
    <div className="edge h-12 rounded-lg bg-plate" />
    <div className="edge h-12 rounded-lg bg-plate" />
    <div className="edge h-12 rounded-lg bg-plate" />
  </div>
);

const deckActions = (onSearch?: () => void) => (
  <>
    <IconButton label="Search this deck" onClick={onSearch}>
      <Search />
    </IconButton>
    <IconButton label="Add a card" variant="primary" round>
      <Plus />
    </IconButton>
    <IconButton label="Deck options">
      <MoreHorizontal />
    </IconButton>
  </>
);

function DeckWithSearch() {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const shown = WORDS.filter((w) => w.term.includes(q) || w.meaning.includes(q));
  return (
    <Screen
      title="Italian with Giulia"
      sub="Italian · 48 cards"
      back={{ label: "Library", to: "/library" }}
      actions={deckActions(() => setSearching(true))}
      bar={
        searching ? (
          <ScreenBar>
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search this deck"
              aria-label="Search this deck"
              className="min-w-0 flex-1"
            />
            <Button
              variant="ghost"
              onClick={() => {
                setSearching(false);
                setQ("");
              }}
            >
              Cancel
            </Button>
          </ScreenBar>
        ) : undefined
      }
    >
      <ul className="edge grid divide-y divide-edge overflow-hidden rounded-lg bg-plate">
        {shown.map((w) => (
          <li key={w.term} className="flex h-12 items-center gap-3 px-4 text-base">
            <span className="font-medium text-text">{w.term}</span>
            <span className="truncate text-text-2">{w.meaning}</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function WordBeside({ theme }: { theme: FrameTheme }) {
  const [word, setWord] = useState<Word | null>(WORDS[0] ?? null);
  return (
    <OnDesktop
      theme={theme}
      path="/library/d1"
      aside={
        word && (
          <aside className="w-[340px] shrink-0 overflow-y-auto border-s border-edge bg-plate px-7 pt-6 pb-10">
            <WordPlace word={word} onClose={() => setWord(null)} />
          </aside>
        )
      }
    >
      <Screen
        title="Italian with Giulia"
        sub="Italian · 48 cards"
        back={{ label: "Library", to: "/library" }}
        actions={deckActions()}
      >
        <WordRows openTerm={word?.term} onOpen={setWord} />
      </Screen>
    </OnDesktop>
  );
}

export const layout: Group = {
  slug: "layout",
  title: "Screens and places",
  lede: "Screen renders the column, the bar and the title from a few props. PlaceBar is the first line of a place and takes its shape from the Dialog around it.",
  entries: [
    {
      slug: "screen",
      name: "Screen",
      source: "components/layout/screen.tsx",
      note: "Two kinds. A tab’s bar holds the lockup and the streak, capture and avatar, which come from one context set at the root. A page’s bar holds its way back and its own controls.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Tab, page, and a page from the learner menu",
              note: "The title sits on the same line in all three. Settings opens from the avatar menu on any tab, so it has no single parent, and back names Today.",
              render: (theme) => (
                <div className="grid w-full gap-6 @3xl:grid-cols-3">
                  <OnPhone theme={theme} path="/today">
                    <Screen kind="tab" title="Today">
                      <Lines />
                    </Screen>
                  </OnPhone>
                  <OnPhone theme={theme} path="/library">
                    <Screen
                      title="Italian with Giulia"
                      sub="Italian · 48 cards"
                      back={{ label: "Library", to: "/library" }}
                      actions={deckActions()}
                    >
                      <Lines />
                    </Screen>
                  </OnPhone>
                  <OnPhone theme={theme} path="/settings">
                    <Screen title="Settings" width="md" back={{ label: "Today", to: "/today" }}>
                      <Lines />
                    </Screen>
                  </OnPhone>
                </div>
              ),
            },
            {
              label: "Loading, a long way back, and a bar that steps aside",
              note: "A missing title renders a skeleton at the title’s height. A long deck name truncates in back before it reaches the controls. Tap search in the third phone. The field replaces the bar at the same height, and Cancel brings the bar back.",
              render: (theme) => (
                <div className="grid w-full gap-6 @3xl:grid-cols-3">
                  <OnPhone theme={theme} path="/library">
                    <Screen title={undefined} back={{ label: "Library", to: "/library" }}>
                      <Lines />
                    </Screen>
                  </OnPhone>
                  <OnPhone theme={theme} path="/library">
                    <Screen
                      title="Deck settings"
                      width="md"
                      backOnDesktop
                      back={{ label: "Eesti keel, class of 2026, evening group", to: "/library" }}
                      actions={
                        <IconButton label="Deck options">
                          <MoreHorizontal />
                        </IconButton>
                      }
                    >
                      <Lines />
                    </Screen>
                  </OnPhone>
                  <OnPhone theme={theme} path="/library">
                    <DeckWithSearch />
                  </OnPhone>
                </div>
              ),
            },
            {
              label: "On a desktop",
              note: "The rail is the way back, so the bar is hidden and the same actions prop renders beside the title.",
              render: (theme) => (
                <OnDesktop theme={theme} path="/library/d1">
                  <Screen
                    title="Italian with Giulia"
                    sub="Italian · 48 cards"
                    back={{ label: "Library", to: "/library" }}
                    actions={deckActions()}
                  >
                    <Lines />
                  </Screen>
                </OnDesktop>
              ),
            },
            {
              label: "On a desktop, keeping its way back",
              note: "backOnDesktop, for a screen whose parent is not a row in the rail.",
              render: (theme) => (
                <OnDesktop theme={theme} path="/library/d1">
                  <Screen
                    title="Deck settings"
                    width="md"
                    backOnDesktop
                    back={{ label: "Italian with Giulia", to: "/library" }}
                  >
                    <Lines />
                  </Screen>
                </OnDesktop>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "place-bar",
      name: "PlaceBar",
      source: "components/layout/place-bar.tsx",
      note: "One part in four shapes, picked by the Dialog around it. On a phone a place arrives from the end edge. Its back button names the screen under it, and a swipe from that edge also goes back. In a sheet, a dialog or beside a list it is a compact row that ends in close.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Sheet and screen",
              note: "A word. Back names its deck. Leave it and open another from the list.",
              render: () => <DeviceFrames specimen="place-word" />,
            },
            {
              label: "Dialog and screen, with a view inside",
              note: "Tap the pencil. On the phone, back names the streak and then Today. On a desktop, back leads the row and close stays at the end.",
              render: () => <DeviceFrames specimen="place-views" />,
            },
            {
              label: "Inline",
              note: "With no Dialog around it, the same word renders as a panel beside its list.",
              render: (theme) => <WordBeside theme={theme} />,
            },
          ]}
        />
      ),
    },
  ],
};
