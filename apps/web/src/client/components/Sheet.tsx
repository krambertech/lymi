import { clsx } from "clsx";
import {
  type ElementType,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Drawer } from "vaul";

/**
 * One sheet, two shapes. On a phone it rises from the bottom edge and can be swiped away,
 * which is where the thumb is. On a desktop a panel pinned to the bottom of a 1400 px window
 * is a phone pattern nobody finished, so it becomes a centred modal built on the platform's
 * own `<dialog>`: focus trapping, Escape and the top layer are then the browser's job.
 *
 * The shape is decided by the pointer as well as the width. A tablet held in two hands gets
 * the drawer at 900 px, because dragging is still the right way to put it away.
 */
const MODAL = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MODAL);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True where a sheet should be a centred modal rather than a drawer. */
export function useModalSheet(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MODAL).matches,
    () => false,
  );
}

interface PanelProps {
  /** Which shape is being drawn. The drawer gets the grabber and a tighter inset. */
  variant: "drawer" | "modal";
  /** The sheet's name. Also its heading, unless the content says what it is already. */
  title: string;
  titleHidden?: boolean | undefined;
  /** The element that carries the accessible name: `Drawer.Title` inside a drawer. */
  titleAs?: ElementType | undefined;
  titleId?: string | undefined;
  children: ReactNode;
}

/**
 * The inside of a sheet, in both shapes and on the design page, so a preview can never
 * drift from the real thing.
 */
export function SheetPanel({
  variant,
  title,
  titleHidden,
  titleAs: Title = "h2",
  titleId,
  children,
}: PanelProps) {
  return (
    <div
      className={clsx(
        "grid max-h-[85dvh] gap-4 overflow-y-auto overscroll-contain",
        variant === "drawer" ? "p-4 pb-5" : "p-5",
      )}
    >
      {variant === "drawer" && (
        <div className="mx-auto -mt-1 h-1 w-9 rounded-full bg-edge-2" aria-hidden="true" />
      )}
      <Title
        // Omitted rather than undefined, so `Drawer.Title` keeps the id its dialog is labelled by.
        {...(titleId ? { id: titleId } : {})}
        className={clsx(titleHidden ? "sr-only" : "text-lg font-medium text-text")}
      >
        {title}
      </Title>
      {children}
    </div>
  );
}

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The content already says what it is; keep the name for screen readers only. */
  titleHidden?: boolean | undefined;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, title, titleHidden, children }: SheetProps) {
  const wide = useModalSheet();
  // The shape is frozen while the sheet is open: crossing 768 px mid-edit would swap one
  // shape for the other, remount the form inside, and take the half-typed word with it.
  const [asModal, setAsModal] = useState(wide);
  if (!open && asModal !== wide) setAsModal(wide);

  return asModal ? (
    <ModalSheet open={open} onOpenChange={onOpenChange} title={title} titleHidden={titleHidden}>
      {children}
    </ModalSheet>
  ) : (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay fixed inset-0 z-(--z-backdrop) bg-scrim" />
        <Drawer.Content
          className="sheet-drawer edge-2 fixed inset-x-0 bottom-0 z-(--z-sheet) mx-auto w-full max-w-md rounded-t-xl bg-plate outline-none pb-safe"
          aria-describedby={undefined}
        >
          <SheetPanel
            variant="drawer"
            title={title}
            titleHidden={titleHidden}
            titleAs={Drawer.Title}
          >
            {children}
          </SheetPanel>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ModalSheet({ open, onOpenChange, title, titleHidden, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // `<dialog>` puts itself in the top layer but leaves the page behind it scrollable. Pad
  // for the scrollbar that goes with it, or the whole app shifts as the sheet opens.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const overflow = body.style.overflow;
    const padding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = overflow;
      body.style.paddingRight = padding;
    };
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the native dialog closes on Escape already; this click only catches the backdrop
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false);
      }}
      className="sheet-modal edge-2 m-auto w-[min(92vw,440px)] rounded-xl bg-plate p-0 text-text"
    >
      <SheetPanel variant="modal" title={title} titleHidden={titleHidden} titleId={titleId}>
        {children}
      </SheetPanel>
    </dialog>
  );
}
