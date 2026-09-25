import { Avatar } from "../../components/avatar";
import { Chip, SourceChip, StateChip } from "../../components/chip";
import { Kbd } from "../../components/kbd";
import { Variants } from "../frame";
import type { Group } from "./types";

export const labels: Group = {
  slug: "labels",
  title: "Labels",
  lede: "Small things that name a state, a source or a key. Status is never colour alone: every chip carries a word.",
  entries: [
    {
      slug: "chip",
      name: "Chip",
      source: "components/chip.tsx",
      note: "State chips carry the state’s icon and a word on a plain chip. The colour is the icon’s alone.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "New",
              note: "Never reviewed. A grey dashed circle: a state is a fact, not something to press.",
              render: () => <StateChip state={0} />,
            },
            {
              label: "Learning",
              note: "Seen, not settled yet. A blue half circle, the hue furthest from amber, danger and good.",
              render: () => <StateChip state={1} />,
            },
            {
              label: "Forgotten recently",
              note: "A relearning card under review, said as what happened, with the Forgot grade’s red arrow. Elsewhere it is Learning.",
              render: () => <StateChip state={3} inReview />,
            },
            {
              label: "Known",
              note: "Settled. A green check circle, and it still says so in words.",
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
      source: "components/chip.tsx",
      note: "Says who wrote a field, so a generated meaning is never mistaken for one from the lesson. The xs size is the badge beside a field's label, which a word carries only for the AI.",
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
              note: "Generated. Violet, the one source with a colour.",
              render: () => <SourceChip source="ai" field="meaning" />,
            },
            {
              label: "AI, no field",
              note: "Where the field is already named next to it.",
              render: () => <SourceChip source="ai" />,
            },
            {
              label: "Badge",
              note: "The badge beside a field's label, on the AI's fields only. A screen reader still hears the whole sentence.",
              render: () => (
                <span className="flex flex-wrap items-center gap-1.5">
                  <SourceChip source="ai" field="meaning" size="xs" />
                  <SourceChip source="ai" field="pronunciation" size="xs" />
                </span>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "kbd",
      name: "Kbd",
      source: "components/kbd.tsx",
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
      source: "components/avatar.tsx",
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
