import { Trans } from "@lingui/react/macro";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerVirtualKeyboardProvider,
  useKeyboardHandoff,
} from "./ui/drawer";

interface Props {
  icon: LucideIcon;
  label: string;
  /** What the field holds, shown in the chip in place of its label. */
  value?: ReactNode;
  /** The value in words, for the chip's accessible name when `value` is not text. */
  valueText?: string | undefined;
  /** Shown in place of the icon once filled, such as the picture itself. */
  thumbnail?: ReactNode;
  invalid?: boolean | undefined;
  /** Whether the field takes typing, so the keyboard rises with the drawer. */
  keyboard?: boolean | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * One optional field of a card, as a chip in the row under the form: its icon and label while
 * empty, its value once filled. Pressing it opens only that field in a drawer. docs/design/library-decks-and-cards.md,
 * "Adding and editing a card".
 */
export function FieldChip({
  icon,
  label,
  value,
  valueText,
  thumbnail,
  invalid,
  keyboard = true,
  open,
  onOpenChange,
  children,
}: Props) {
  const filled = value !== undefined && value !== null && value !== "" && value !== false;
  const bodyRef = useRef<HTMLDivElement>(null);
  const field = useCallback(
    () => bodyRef.current?.querySelector<HTMLElement>("input:not([type=file]), textarea"),
    [],
  );
  const handoff = useKeyboardHandoff(field);
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={keyboard ? handoff.handOff : undefined}
      showSwipeHandle
    >
      <DrawerTrigger
        render={
          <Chip
            icon={icon}
            onClick={keyboard ? handoff.warmUp : undefined}
            thumbnail={filled ? thumbnail : undefined}
            filled={filled}
            aria-label={
              filled
                ? `${label}: ${valueText ?? (typeof value === "string" ? value : label)}`
                : undefined
            }
            aria-invalid={invalid || undefined}
          >
            {filled ? value : label}
          </Chip>
        }
      />
      {keyboard && handoff.input}
      <DrawerVirtualKeyboardProvider>
        {/* The field is why the drawer opened, so the keyboard comes up with it. */}
        <DrawerContent initialFocus={keyboard ? handoff.initialFocus : () => field() ?? true}>
          <DrawerHeader className="px-4 pt-1">
            <DrawerTitle className="text-base">{label}</DrawerTitle>
          </DrawerHeader>
          <div
            ref={bodyRef}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 px-4 pt-3 pb-5"
          >
            {children}
            <Button className="h-11 w-full" onClick={() => onOpenChange(false)}>
              <Trans>Done</Trans>
            </Button>
          </div>
        </DrawerContent>
      </DrawerVirtualKeyboardProvider>
    </Drawer>
  );
}

interface ChipProps extends ComponentProps<"button"> {
  icon: LucideIcon;
  thumbnail?: ReactNode;
  filled: boolean;
}

function Chip({ icon: Icon, thumbnail, filled, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "relative inline-flex h-8 max-w-44 shrink-0 items-center gap-1.5 rounded-sm bg-plate-2 ps-2 pe-2.5 text-sm font-medium edge transition-[box-shadow,background-color,color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:edge-2 aria-expanded:edge-2 aria-invalid:shadow-[0_0_0_1px_var(--danger)]",
        filled ? "text-text" : "text-text-2 hoverable:hover:text-text aria-invalid:text-danger",
        // The hit area reaches 44 px without moving the row.
        "before:absolute before:-inset-1.5 before:content-['']",
        className,
      )}
    >
      {thumbnail ?? (
        <Icon
          className={cn("size-4 shrink-0", filled ? "text-text-2" : "text-muted")}
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

/**
 * The row the chips sit in: one line that scrolls sideways once the chips outgrow it, fading at
 * the edge that has more.
 */
export function FieldChipRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    measure();
    // A chip that fills in grows the row, which a mutation of its text reports.
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const mutation = new MutationObserver(measure);
    mutation.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a row of controls with a name, which a fieldset is not
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn(
        // Room for focus rings inside the clip.
        "-mx-4 flex items-center gap-2 overflow-x-auto overscroll-x-contain px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        more && "[mask-image:linear-gradient(to_left,transparent,black_2.5rem)]",
      )}
    >
      {children}
    </div>
  );
}
