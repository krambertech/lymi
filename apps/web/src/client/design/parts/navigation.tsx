import type { ReactNode } from "react";
import { DueCount } from "../../components/due-count";
import { NavLink, StaticNavProvider } from "../../components/nav-link";
import { PillNav } from "../../components/pill-nav";
import { RailHeading, RailNav, RailRow } from "../../components/rail-nav";
import { StreakButton } from "../../components/streak";
import { NAV, type NavDeck, Sidebar } from "../../views/shell";
import { Force } from "../forced-states";
import { Variants } from "../frame";
import { decks, me, railSeries, seriesDecks, streak } from "../mock";
import { type Group, noop } from "./types";

function RailScene({ path, decks: shown }: { path: string; decks: NavDeck[] }): ReactNode {
  return (
    <div className="edge flex h-[640px] w-full overflow-hidden rounded-md">
      <StaticNavProvider path={path}>
        <Sidebar
          decks={shown}
          series={railSeries}
          name={me.name}
          docsUrl="https://lymi.app/docs"
          onAdd={noop}
          streak={<StreakButton variant="rail" summary={streak} />}
        />
      </StaticNavProvider>
      <div className="flex-1 bg-canvas" />
    </div>
  );
}

export const navigation: Group = {
  slug: "navigation",
  title: "Navigation",
  lede: "Two destinations, Today and Library. Review is the primary button on both, never a place you navigate to. Settings, Activity and Archived sit behind the learner.",
  entries: [
    {
      slug: "rail",
      name: "Rail",
      source: "views/shell.tsx",
      note: "The desktop navigation: 240 px, the full height of the window, in the rail tone with a hairline down its inner side. The first line and the learner stay put while the places between them scroll.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "On a deck in a series",
              note: "Decks heads the decks without a series; each series is a section of its own, headed by its name in the same style.",
              render: () => (
                <RailScene path="/library/s2" decks={[...decks.slice(0, 2), ...seriesDecks]} />
              ),
            },
            {
              label: "Every deck in one series",
              note: "With no decks outside a series, Decks is left out and the series stands alone.",
              render: () => <RailScene path="/today" decks={seriesDecks} />,
            },
          ]}
        />
      ),
    },
    {
      slug: "rail-rows",
      name: "Rail rows",
      source: "components/rail-nav.tsx",
      note: "RailNav lays one hover fill under its rows. Point across them: the fill slides between rows and fades in fresh past a heading. The current row is the strongest; hover sits under it in both rooms.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Rest, current, focus",
              render: () => (
                <div className="w-60 rounded-md bg-rail p-3">
                  <StaticNavProvider path="/library">
                    <RailNav>
                      {NAV.slice(0, 3).map((n) => (
                        <RailRow
                          key={n.to}
                          render={<NavLink to={n.to} />}
                          icon={<n.icon aria-hidden="true" />}
                        >
                          {n.label.message}
                        </RailRow>
                      ))}
                      <RailHeading>Decks</RailHeading>
                      <RailRow
                        render={<NavLink to="/library/$deckId" params={{ deckId: "d1" }} />}
                        end={<DueCount>8</DueCount>}
                      >
                        Italian with Giulia
                      </RailRow>
                      <Force state="focus">
                        <RailRow
                          render={<NavLink to="/library/$deckId" params={{ deckId: "d2" }} />}
                        >
                          Portuguese
                        </RailRow>
                      </Force>
                    </RailNav>
                  </StaticNavProvider>
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "pill-nav",
      name: "Pill nav",
      source: "components/pill-nav.tsx",
      note: "The phone navigation: a floating pill two items wide, opaque over the content. The same shape as the segmented control, because a frosted pill is a material the rest of the app does not use. Hidden during review.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "On Today",
              render: () => (
                <StaticNavProvider path="/today">
                  <PillNav />
                </StaticNavProvider>
              ),
            },
            {
              label: "On Library",
              render: () => (
                <StaticNavProvider path="/library">
                  <PillNav />
                </StaticNavProvider>
              ),
            },
          ]}
        />
      ),
    },
  ],
};
