import { Avatar } from "../../components/Avatar";
import { Chip, SourceChip, StateChip } from "../../components/Chip";
import { Kbd } from "../../components/Kbd";
import { Variants } from "../Frame";
import type { Group } from "./types";

export const labels: Group = {
  slug: "labels",
  title: "Labels",
  lede: "Small things that name a state, a source or a key. Status is never colour alone: every chip carries a word.",
  entries: [
    {
      slug: "chip",
      name: "Chip",
      source: "components/Chip.tsx",
      note: "State chips carry a dot and a word.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "New",
              note: "Never reviewed. Grey: a state is a fact, not something to press.",
              render: () => <StateChip state={0} />,
            },
            {
              label: "Learning",
              note: "Seen, not settled yet. Mustard, well off amber’s hue.",
              render: () => <StateChip state={1} />,
            },
            {
              label: "Relearning",
              note: "Forgotten, and on its way back.",
              render: () => <StateChip state={3} />,
            },
            {
              label: "Known",
              note: "Settled. Green, and it still says so in words.",
              render: () => <StateChip state={2} />,
            },
            {
              label: "Plain",
              note: "Names a thing, like a deck.",
              render: () => <Chip>Lesson 14</Chip>,
            },
            {
              label: "Danger",
              note: "Out of review: an archived card or deck.",
              render: () => <Chip tone="danger">Archived</Chip>,
            },
          ]}
        />
      ),
    },
    {
      slug: "source-chip",
      name: "Source chip",
      source: "components/Chip.tsx",
      note: "Says who wrote a field, so a generated meaning is never mistaken for one from the lesson.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Lesson",
              note: "Came from the lesson material.",
              render: () => <SourceChip source="lesson" field="meaning" />,
            },
            {
              label: "Typed",
              note: "The learner wrote it.",
              render: () => <SourceChip source="manual" field="example" />,
            },
            {
              label: "AI",
              note: "Generated. A dashed edge on top of the label.",
              render: () => <SourceChip source="ai" field="meaning" />,
            },
            {
              label: "AI, no field",
              note: "Where the field is already named next to it.",
              render: () => <SourceChip source="ai" />,
            },
          ]}
        />
      ),
    },
    {
      slug: "kbd",
      name: "Kbd",
      source: "components/Kbd.tsx",
      note: "Keyboard hints are part of the copy on desktop.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Key",
              note: "One key, beside the action it triggers.",
              render: () => (
                <>
                  <Kbd>N</Kbd>
                  <Kbd>R</Kbd>
                </>
              ),
            },
            {
              label: "Named key",
              note: "Spelled out rather than drawn as a symbol.",
              render: () => (
                <>
                  <Kbd>Space</Kbd>
                  <Kbd>Esc</Kbd>
                </>
              ),
            },
            {
              label: "Range",
              note: "The four grades.",
              render: () => <Kbd>1 – 4</Kbd>,
            },
            {
              label: "On primary",
              note: "Inside the amber button it takes the on-primary tone.",
              render: () => (
                <span className="inline-flex items-center rounded-md bg-amber px-3 py-1.5 text-sm text-amber-ink">
                  Review
                  <Kbd tone="on-primary" className="ms-2">
                    R
                  </Kbd>
                </span>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "avatar",
      name: "Avatar",
      source: "components/Avatar.tsx",
      note: "The learner, as one letter on a plate. No photo: a face would be a second illustration.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "34 px",
              note: "The learner row at the bottom of the rail.",
              render: () => <Avatar name="Kateryna" size={34} />,
            },
            {
              label: "24 px",
              note: "Inline, next to a line of text.",
              render: () => <Avatar name="Kateryna" size={24} />,
            },
          ]}
        />
      ),
    },
  ],
};
