import { Archive, FolderInput, MoreHorizontal, Pencil, Volume2 } from "lucide-react";
import { useId, useState } from "react";
import { Button, IconButton } from "../components/button";
import { Flame } from "../components/flame";
import { GoalPicker } from "../components/goal-picker";
import { PlaceBar } from "../components/layout/place-bar";
import { Dialog, DialogContent } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export const WORDS = [
  {
    term: "sbrigarsi",
    meaning: "to hurry up",
    example: "Sbrigati, il treno parte tra cinque minuti.",
  },
  { term: "magari", meaning: "maybe; if only", example: "Magari potessi venire anch’io." },
  { term: "il binario", meaning: "the platform", example: "Il treno parte dal binario sette." },
  { term: "in ritardo", meaning: "late", example: "Sono in ritardo di dieci minuti." },
];
export type Word = (typeof WORDS)[number];

function WordMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label="Card options" size="sm">
            <MoreHorizontal aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label="Card options" align="end">
        <DropdownMenuItem>
          <FolderInput />
          Move to…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">
          <Archive />
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A word as a place: the same parts in a sheet, over the whole screen, or beside its list. */
export function WordPlace({
  word,
  titleId,
  onClose,
}: {
  word: Word;
  titleId?: string | undefined;
  onClose: () => void;
}) {
  return (
    <article className="flex min-w-0 flex-col gap-5">
      <PlaceBar parent="Italian with Giulia" actions={<WordMenu />} onClose={onClose} />
      <h1
        id={titleId}
        tabIndex={-1}
        className="flex items-center gap-3 text-3xl font-medium leading-[1.05] tracking-[-0.03em] outline-none"
        lang="it"
      >
        {word.term}
        <IconButton label={`Say ${word.term}`} variant="secondary" round size="sm">
          <Volume2 />
        </IconButton>
      </h1>
      <p className="text-md text-text">{word.meaning}</p>
      <p className="text-base text-text-2" lang="it">
        {word.example}
      </p>
    </article>
  );
}

export function WordRows({
  openTerm,
  onOpen,
}: {
  openTerm?: string | undefined;
  onOpen: (word: Word) => void;
}) {
  return (
    <ul className="edge grid divide-y divide-edge overflow-hidden rounded-lg bg-plate">
      {WORDS.map((w) => (
        <li key={w.term}>
          <button
            type="button"
            onClick={() => onOpen(w)}
            aria-current={openTerm === w.term ? "true" : undefined}
            className="flex h-12 w-full items-center gap-3 px-4 text-start text-base transition-colors duration-150 hoverable:hover:bg-hover aria-[current]:bg-plate-2"
          >
            <span className="font-medium text-text" lang="it">
              {w.term}
            </span>
            <span className="truncate text-text-2">{w.meaning}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Opens as the frame loads; a row opens it again once it is dismissed. */
export function WordPlaceScene() {
  const [word, setWord] = useState<Word | null>(WORDS[0] ?? null);
  const [shown, setShown] = useState<Word>(WORDS[0] as Word);
  const titleId = useId();
  const open = (w: Word) => {
    setShown(w);
    setWord(w);
  };
  return (
    <>
      <WordRows onOpen={open} />
      <Dialog kind="place" open={!!word} onOpenChange={(next) => !next && setWord(null)}>
        <DialogContent
          placement="end"
          aria-labelledby={titleId}
          initialFocus={() => document.getElementById(titleId)}
          className="px-7 pt-6 pb-10"
        >
          <WordPlace word={shown} titleId={titleId} onClose={() => setWord(null)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A centred place with a view inside it, so back takes the slot close had. */
export function StreakPlaceScene() {
  const [open, setOpen] = useState(true);
  const [view, setView] = useState<"streak" | "goal">("streak");
  const [goal, setGoal] = useState(25);
  const titleId = useId();
  const close = () => setOpen(false);
  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setView("streak");
          setOpen(true);
        }}
      >
        Open the streak
      </Button>
      <Dialog kind="place" open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[min(92vw,400px)]"
          aria-labelledby={titleId}
          initialFocus={() => document.getElementById(titleId)}
        >
          {view === "streak" ? (
            <>
              <PlaceBar title="Streak" returnsTo="Today" onClose={close} />
              <div className="flex items-center gap-3.5">
                <Flame className="h-11 w-9" state="full" />
                <div className="grid">
                  <h2
                    id={titleId}
                    tabIndex={-1}
                    className="flex items-baseline gap-2 text-text outline-none"
                  >
                    <span className="text-3xl font-semibold leading-none tabular-nums">12</span>
                    <span className="text-md font-medium">days in a row</span>
                  </h2>
                  <p className="mt-1.5 text-sm text-text-2">Today’s goal is reached.</p>
                </div>
              </div>
              <div className="edge flex items-center gap-3 rounded-lg bg-plate-2 p-4">
                <span className="flex-1 text-base text-text">{goal} reviews a day</span>
                <IconButton
                  label="Change daily goal"
                  size="sm"
                  variant="secondary"
                  onClick={() => setView("goal")}
                >
                  <Pencil aria-hidden="true" />
                </IconButton>
              </div>
            </>
          ) : (
            <div className="enter-fade grid gap-4">
              <PlaceBar
                back={{ label: "Streak", onClick: () => setView("streak") }}
                title={
                  <h2 id={titleId} tabIndex={-1} className="outline-none">
                    Daily goal
                  </h2>
                }
                onClose={close}
              />
              <p className="text-sm text-text-2">How many reviews keep the streak each day.</p>
              <GoalPicker value={goal} onValueChange={setGoal} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
