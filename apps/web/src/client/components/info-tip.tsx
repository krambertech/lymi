import { Info } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { IconButton } from "./button";
import { Popover, PopoverContent } from "./ui/popover";

interface Props {
  /** What the button explains, as its accessible name says it: "About the daily limit". */
  label: string;
  /** Which edge of the button the note lines up with; `start` for a button at the start of a bar. */
  align?: "start" | "center" | "end";
  children: ReactNode;
}

/** An info button that opens a few sentences about the thing beside it; a tap or Escape closes it. */
export function InfoTip({ label, align = "center", children }: Props) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        ref={anchor}
        size="sm"
        label={label}
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
      >
        <Info />
      </IconButton>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverContent anchor={anchor} align={align} className="leading-snug">
          {children}
        </PopoverContent>
      </Popover>
    </>
  );
}
