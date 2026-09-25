import { Archive, Download, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import { type ComponentType, useState } from "react";
import { Button } from "../components/button";
import { NewDeckForm } from "../components/new-deck-sheet";
import { StreakPlace } from "../components/streak";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "../components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Field, FieldLabel } from "../components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { StreakPlaceScene, WordPlaceScene } from "./layout-scenes";
import { streak } from "./mock";
import { noop } from "./parts/types";

export const OWN_DECKS = [
  { value: "d1", label: "Lesson 14" },
  { value: "d2", label: "Portuguese" },
];
export const SHARED_DECKS = [
  { value: "d3", label: "Українська для Марко" },
  { value: "d4", label: "Eesti keel, class of 2026" },
];
export const DECKS = [...OWN_DECKS, ...SHARED_DECKS];
type Deck = (typeof DECKS)[number];

const OWN_GROUP = { value: "own", label: "Your decks", items: OWN_DECKS };
const SHARED_GROUP = { value: "shared", label: "Shared with you", items: SHARED_DECKS };

interface DeckChoiceProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Groups the decks the way Library does. */
  grouped?: boolean | undefined;
}

/** A deck picked from a short list. */
export function DeckSelect({
  value,
  onChange,
  placeholder = "Choose a deck",
  disabled,
  defaultOpen,
  grouped,
}: DeckChoiceProps) {
  const item = (d: Deck) => (
    <SelectItem key={d.value} value={d.value}>
      {d.label}
    </SelectItem>
  );
  return (
    <Select
      value={value}
      onValueChange={onChange}
      items={DECKS}
      disabled={disabled}
      defaultOpen={defaultOpen}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent aria-label="Deck">
        {grouped ? (
          <>
            <SelectGroup>
              <SelectLabel>{OWN_GROUP.label}</SelectLabel>
              {OWN_DECKS.map(item)}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{SHARED_GROUP.label}</SelectLabel>
              {SHARED_DECKS.map(item)}
            </SelectGroup>
          </>
        ) : (
          DECKS.map(item)
        )}
      </SelectContent>
    </Select>
  );
}

/** Decks to search, grouped the way Library groups them. */
export function DeckCombobox({
  value,
  onChange,
  disabled,
  defaultOpen,
}: Omit<DeckChoiceProps, "placeholder" | "grouped">) {
  return (
    <Combobox<Deck>
      items={[OWN_GROUP, SHARED_GROUP]}
      value={DECKS.find((d) => d.value === value) ?? null}
      onValueChange={(next) => onChange(next?.value ?? null)}
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
      defaultOpen={defaultOpen}
    >
      <ComboboxTrigger>
        <ComboboxValue placeholder="Choose a deck" />
      </ComboboxTrigger>
      <ComboboxContent aria-label="Deck">
        <ComboboxInput placeholder="Search decks" />
        <ComboboxEmpty>No deck by that name.</ComboboxEmpty>
        <ComboboxList>
          {(group: typeof OWN_GROUP, index: number) => (
            <ComboboxGroup key={group.value} items={group.items}>
              {index > 0 && <ComboboxSeparator />}
              <ComboboxLabel>{group.label}</ComboboxLabel>
              <ComboboxCollection>
                {(deck: Deck) => (
                  <ComboboxItem key={deck.value} value={deck}>
                    <span className="flex-1 truncate">{deck.label}</span>
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** Opens as the frame loads, and its trigger opens it again once it is dismissed. */
function useOpen() {
  return useState(true);
}

function MenuScene() {
  const [open, setOpen] = useOpen();
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button size="sm">
            Deck options
            <MoreHorizontal aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent aria-label="Deck options" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Lesson 14</DropdownMenuLabel>
          <DropdownMenuItem>
            <Pencil />
            Deck settings
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download />
            Export
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Share2 />
            Share with a class
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Archive />
          Archive deck
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConfirmationScene() {
  const [open, setOpen] = useOpen();
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              Every deck, card and review goes with it. This is the one action in Lymi that cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep account
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormScene() {
  const [open, setOpen] = useOpen();
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New deck
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,440px)]">
          <DialogTitle>New deck</DialogTitle>
          <NewDeckForm onCancel={() => setOpen(false)} onSubmit={() => undefined} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlaceScene() {
  const [open, setOpen] = useOpen();
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Open the streak
      </Button>
      <StreakPlace open={open} onOpenChange={setOpen} summary={streak} onGoalChange={noop} />
    </>
  );
}

function SelectScene() {
  const [deck, setDeck] = useState<string | null>("d1");
  return (
    <Field className="max-w-sm">
      <FieldLabel>Deck</FieldLabel>
      <DeckSelect value={deck} onChange={setDeck} defaultOpen grouped />
    </Field>
  );
}

function NestedScene() {
  const [open, setOpen] = useOpen();
  const [deck, setDeck] = useState<string | null>("d1");
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Move card
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,440px)]">
          <DialogTitle>Move “sbrigarsi”</DialogTitle>
          <Field>
            <FieldLabel>Deck</FieldLabel>
            <DeckSelect value={deck} onChange={setDeck} defaultOpen />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Move card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComboboxScene() {
  const [deck, setDeck] = useState<string | null>("d3");
  return (
    <Field className="max-w-sm">
      <FieldLabel>Deck</FieldLabel>
      <DeckCombobox value={deck} onChange={setDeck} defaultOpen />
    </Field>
  );
}

export interface Specimen {
  /** Names the frame for assistive technology. */
  name: string;
  /** The desktop frame's height, at 768 px wide. */
  height: number;
  /** The phone frame's height, at 390 px wide, when it needs more room than the desktop's. */
  touchHeight?: number | undefined;
  Scene: ComponentType;
}

export const SPECIMENS = {
  menu: { name: "An open menu", height: 360, touchHeight: 520, Scene: MenuScene },
  confirmation: { name: "A confirmation", height: 360, touchHeight: 520, Scene: ConfirmationScene },
  form: { name: "A form", height: 520, touchHeight: 640, Scene: FormScene },
  nested: { name: "A list over a form", height: 480, touchHeight: 640, Scene: NestedScene },
  place: { name: "The streak place", height: 760, touchHeight: 844, Scene: PlaceScene },
  "place-word": { name: "A word as a place", height: 560, touchHeight: 844, Scene: WordPlaceScene },
  "place-views": {
    name: "A place with a view inside it",
    height: 560,
    touchHeight: 844,
    Scene: StreakPlaceScene,
  },
  select: { name: "An open select", height: 360, touchHeight: 520, Scene: SelectScene },
  combobox: { name: "An open combobox", height: 420, touchHeight: 640, Scene: ComboboxScene },
} satisfies Record<string, Specimen>;

export type SpecimenId = keyof typeof SPECIMENS;
