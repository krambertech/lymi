import { PillNav } from "../../components/pill-nav";
import { Sidebar } from "../../views/shell";
import { Variants } from "../frame";
import { decks, me } from "../mock";
import { type Group, noop } from "./types";

export const navigation: Group = {
  slug: "navigation",
  title: "Navigation",
  lede: "Two destinations, Today and Library. Review is the primary button on both, never a place you navigate to. Settings, Activity and Archived sit behind the learner.",
  entries: [
    {
      slug: "rail",
      name: "Rail",
      source: "views/shell.tsx",
      note: "The desktop navigation: 240 px, the full height of the window, in the rail tone with a hairline down its inner side.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "On Today",
              note: "The mark, search and capture share the first line, level with the page title. Then the destinations, the decks with their due counts, and the learner under a rule.",
              render: () => (
                <div className="edge flex h-[620px] w-full overflow-hidden rounded-md">
                  <Sidebar
                    decks={decks}
                    name={me.name}
                    docsUrl="https://lymi.app/docs"
                    onAdd={noop}
                    static={{ path: "/today" }}
                  />
                  <div className="flex-1 bg-canvas" />
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
              render: () => <PillNav static={{ path: "/today" }} />,
            },
            {
              label: "On Library",
              render: () => <PillNav static={{ path: "/library" }} />,
            },
          ]}
        />
      ),
    },
  ],
};
