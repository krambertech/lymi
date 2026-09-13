import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Progress } from "../../components/Progress";
import { Skeleton } from "../../components/Skeleton";
import { Toast } from "../../components/Toast";
import { Variants } from "../Frame";
import { type Group, noop } from "./types";

export const feedback: Group = {
  slug: "feedback",
  title: "Feedback",
  lede: "What the app says while something is happening, just after it happened, or when there is nothing to show yet.",
  entries: [
    {
      slug: "progress",
      name: "Progress",
      source: "components/Progress.tsx",
      note: "A 3 px track. How far through a session, never a score.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Mid-session",
              note: "5 of 11 cards reviewed.",
              render: () => <Progress value={0.46} label="Session progress" className="w-full" />,
            },
          ]}
        />
      ),
    },
    {
      slug: "toast",
      name: "Toast",
      source: "components/Toast.tsx",
      note: "The text colour, one at a time. It pauses while the tab is hidden and leaves faster than it came.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "With Undo",
              note: "After an action that can be taken back. Undo replaces a confirmation dialog.",
              render: () => (
                <Toast inline action={{ label: "Undo", onClick: noop }}>
                  Archived “sbrigarsi”
                </Toast>
              ),
            },
            {
              label: "Plain",
              note: "Says something happened, with nothing to take back.",
              render: () => <Toast inline>Copied to the clipboard</Toast>,
            },
          ]}
        />
      ),
    },
    {
      slug: "skeleton",
      name: "Skeleton",
      source: "components/Skeleton.tsx",
      note: "Holds the loaded shape, so nothing jumps when the data lands. It stops shimmering under reduced motion.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "A list loading",
              note: "A title line, then rows at their real height.",
              render: () => (
                <div className="grid w-full gap-2">
                  <Skeleton className="h-9 w-2/3" />
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "empty-state",
      name: "Empty state",
      source: "components/EmptyState.tsx",
      note: "Teaches rather than apologises: what goes here, and the action that fills it.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "With an action",
              note: "Something the learner can do right now fills the screen.",
              render: () => (
                <EmptyState
                  title="Nothing here yet"
                  body="Create a deck, add a card from your last lesson, and the lantern comes on."
                  action={<Button variant="primary">New deck</Button>}
                  className="w-full py-4"
                />
              ),
            },
            {
              label: "Waiting",
              note: "Nothing to do about it yet, so no button.",
              render: () => (
                <EmptyState
                  title="Nothing to say yet"
                  body="This fills in once there is some history behind you."
                  className="w-full py-4"
                />
              ),
            },
          ]}
        />
      ),
    },
  ],
};
