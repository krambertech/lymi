import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../../components/button";
import { ErrorTip } from "../../components/error-tip";
import { Progress } from "../../components/progress";
import { Skeleton } from "../../components/skeleton";
import {
  createToastManager,
  ToastList,
  ToastProvider,
  ToastViewport,
  toast,
} from "../../components/ui/toast";
import { Force } from "../forced-states";
import { Variants } from "../frame";
import { type Group, noop } from "./types";

export const feedback: Group = {
  slug: "feedback",
  title: "Feedback",
  lede: "What the app says while something is happening, or just after it happened. When there is nothing to show yet, see Empty states.",
  entries: [
    {
      slug: "progress",
      name: "Progress",
      source: "components/progress.tsx",
      note: "An 8 px track. How far through a session, never a score.",
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
              label: "Hover",
              note: "The action and the close button each take a faint fill under a pointer.",
              render: () => (
                <Force state="hover" on="[data-slot=toast-action]">
                  <ToastPreview title="Archived “sbrigarsi”" action="Undo" />
                </Force>
              ),
            },
            {
              label: "Focus",
              note: "Focus inside the stack spreads it open and holds every timer.",
              render: () => (
                <Force state="focus" on="[data-slot=toast-close]">
                  <ToastPreview title="Archived “sbrigarsi”" action="Undo" />
                </Force>
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
      slug: "error-tip",
      name: "Error tip",
      source: "components/error-tip.tsx",
      note: "What went wrong, over the control it went wrong on, on the shadcn Base UI popover. It flips below when there is no room above, leaves after four seconds or at the next tap, key or scroll, and is announced once. Focus stays on the control.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Try it",
              note: "The pronunciation button in review, after audio fails.",
              render: () => <ErrorTipTrigger />,
            },
          ]}
        />
      ),
    },
    {
      slug: "skeleton",
      name: "Skeleton",
      source: "components/skeleton.tsx",
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
  ],
};

function ToastPreview({
  title,
  action,
  type,
}: {
  title: string;
  action?: string | undefined;
  type?: "error" | undefined;
}) {
  // Its own manager, so a held-open preview never joins the app's stack.
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
      {/* The live viewport's toast layer would climb over the page's sticky header. */}
      <ToastViewport aria-label="Toast preview" className="static isolate z-0 mx-0 w-full">
        <ToastList
          closeLabel="Dismiss"
          className="static h-auto [transform:none] data-expanded:h-auto data-expanded:[transform:none] data-starting-style:[transform:none] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:none]"
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

function ErrorTipTrigger() {
  const button = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-3 text-base">
      Play the word
      <IconButton
        ref={button}
        label="Play pronunciation"
        size="sm"
        variant={error ? "danger" : "secondary"}
        round
        onClick={() => {
          setError(null);
          window.setTimeout(() => setError("Couldn’t play the pronunciation. Try again."), 300);
        }}
      >
        <Volume2 aria-hidden="true" />
      </IconButton>
      <ErrorTip anchor={button} message={error} />
    </span>
  );
}
