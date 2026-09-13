import { useEffect, useState } from "react";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Progress } from "../../components/Progress";
import { Skeleton } from "../../components/Skeleton";
import {
  createToastManager,
  ToastList,
  ToastProvider,
  ToastViewport,
  toast,
} from "../../components/ui/toast";
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
      source: "components/ui/toast.tsx",
      note: "The shadcn Base UI toast in Lymi's colours: the text colour, one optional action, a close button, and an icon for an error. Up to three collapse into a stack with the newest in front, and it opens while the pointer or keyboard focus is on it. Timers hold then, and while the window is in the background.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Try it",
              note: "Fires the app's real toast: bottom centre on a phone, the bottom-end corner from 640 px. Four in a row shows the oldest leaving once three are up. Point at the stack to open it.",
              render: () => <ToastTriggers />,
            },
            {
              label: "With Undo",
              note: "After an action that can be taken back. Undo replaces a confirmation dialog.",
              render: () => <ToastPreview title="Archived “sbrigarsi”" action="Undo" />,
            },
            {
              label: "Error with Retry",
              note: "Something failed and can be tried again. An error is announced at once.",
              render: () => (
                <ToastPreview
                  type="error"
                  title="Couldn’t save “sbrigarsi”. Check your connection and try again."
                  action="Retry"
                />
              ),
            },
            {
              label: "Error",
              note: "Says what failed and what to do, with nothing to press.",
              render: () => (
                <ToastPreview
                  type="error"
                  title="Couldn’t play the pronunciation. Try again in a moment."
                />
              ),
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

/** A real toast held open in place, on its own manager so it never replaces the app's toast. */
function ToastPreview({
  title,
  action,
  type,
}: {
  title: string;
  action?: string | undefined;
  type?: "error" | undefined;
}) {
  const [manager] = useState(createToastManager);
  useEffect(() => {
    const id = manager.add({
      title,
      type,
      timeout: 0,
      ...(action ? { actionProps: { children: action, onClick: noop } } : {}),
    });
    return () => manager.close(id);
  }, [manager, title, action, type]);
  return (
    <ToastProvider toastManager={manager}>
      <ToastViewport aria-label="Toast preview" className="static mx-0 w-full">
        <ToastList
          closeLabel="Dismiss"
          className="static h-auto [transform:none] data-expanded:h-auto data-expanded:[transform:none]"
        />
      </ToastViewport>
    </ToastProvider>
  );
}

function ToastTriggers() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => {
          const id = toast.add({
            title: "Archived “sbrigarsi”",
            actionProps: { children: "Undo", onClick: () => toast.close(id) },
          });
        }}
      >
        Archive a card
      </Button>
      <Button
        size="sm"
        onClick={() => {
          const id = toast.add({
            type: "error",
            title: "Couldn’t save “sbrigarsi”. Check your connection and try again.",
            actionProps: { children: "Retry", onClick: () => toast.close(id) },
          });
        }}
      >
        Fail a save
      </Button>
      <Button
        size="sm"
        onClick={() =>
          toast.add({
            type: "error",
            title: "Couldn’t play the pronunciation. Try again in a moment.",
          })
        }
      >
        Fail a pronunciation
      </Button>
      <Button
        size="sm"
        onClick={() => {
          ["uno", "due", "tre", "quattro"].forEach((term, i) => {
            window.setTimeout(() => toast.add({ title: `Archived “${term}”` }), i * 700);
          });
        }}
      >
        Four in a row
      </Button>
    </div>
  );
}
