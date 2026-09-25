import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import * as React from "react";
import { useOverlayShape } from "../../lib/device";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerVirtualKeyboardProvider,
} from "./drawer";

/*
 * shadcn's Dialog, in the shape of the machine: centred on a desktop, a drawer from the bottom edge
 * on a touch device, for a form and a question alike. A place, such as the streak, is a page
 * on touch and arrives from the end edge, and may stand at the end edge on a desktop as a side sheet. Every
 * part below renders both shapes, so a call site never
 * asks which machine it is on. Lymi drops the generated corner close button: its dialogs end in
 * explicit actions. ADR 0017.
 */

type Shape = "desktop" | "touch";
type Kind = "moment" | "place";

const DialogShapeContext = React.createContext<{ shape: Shape; kind: Kind } | null>(null);

export type PlaceShape = "screen" | "sheet" | "dialog" | "inline";

const PlaceShapeContext = React.createContext<PlaceShape>("inline");

/** The shape the content around a part took; "inline" outside any Dialog, such as a panel beside a list. */
function usePlaceShape() {
  return React.useContext(PlaceShapeContext);
}

/** The drawer's directions are physical, so the end edge is read from the document as the place opens. */
function endEdge() {
  return typeof document !== "undefined" && document.documentElement.dir === "rtl"
    ? "left"
    : "right";
}

function useDialogContext(part: string) {
  const context = React.useContext(DialogShapeContext);
  if (!context) throw new Error(`${part} must be used within a Dialog.`);
  return context;
}

function useDialogShape(part: string) {
  return useDialogContext(part).shape;
}

function Dialog({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  kind = "moment",
  children,
}: {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** A moment is done and dismissed; a place is gone to and read, and its open state is the caller's URL. */
  kind?: Kind | undefined;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const shape = useOverlayShape(open);
  const context = React.useMemo(() => ({ shape, kind }), [shape, kind]);
  return (
    <DialogShapeContext.Provider value={context}>
      {shape === "desktop" ? (
        <DialogPrimitive.Root data-slot="dialog" open={open} onOpenChange={setOpen}>
          {children}
        </DialogPrimitive.Root>
      ) : kind === "place" ? (
        // A place is a page on touch, so it arrives from the end edge and a swipe toward that edge goes back.
        <Drawer open={open} onOpenChange={setOpen} swipeDirection={endEdge()}>
          {children}
        </Drawer>
      ) : (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          {/* Keeps a focused field above the software keyboard when the dialog holds a form. */}
          <DrawerVirtualKeyboardProvider>{children}</DrawerVirtualKeyboardProvider>
        </Drawer>
      )}
    </DialogShapeContext.Provider>
  );
}

/** Compose the control through `render`: `<DialogTrigger render={<Button … />} />`. */
function DialogTrigger({ render }: { render: React.ReactElement }) {
  return useDialogShape("DialogTrigger") === "desktop" ? (
    <DialogPrimitive.Trigger data-slot="dialog-trigger" render={render} />
  ) : (
    <DrawerTrigger data-slot="dialog-trigger" render={render} />
  );
}

function DialogClose({ render }: { render: React.ReactElement }) {
  return useDialogShape("DialogClose") === "desktop" ? (
    <DialogPrimitive.Close data-slot="dialog-close" render={render} />
  ) : (
    <DrawerClose data-slot="dialog-close" render={render} />
  );
}

function DialogContent({
  className,
  initialFocus,
  finalFocus,
  "aria-labelledby": labelledBy,
  placement = "center",
  children,
}: {
  /** Where the desktop shape stands: centred, or a full-height sheet at the end edge for a place read beside the page. */
  placement?: "center" | "end" | undefined;
  /** Dresses the centred dialog, usually its width. The drawer sizes itself, so it ignores this. */
  className?: string | undefined;
  /** Where focus lands on opening, when the first control is not the safe one. */
  initialFocus?: DialogPrimitive.Popup.Props["initialFocus"];
  /** Where focus lands on closing, when the control that opened it is gone. */
  finalFocus?: DialogPrimitive.Popup.Props["finalFocus"];
  /** Names it by a heading inside it, for content that renders its own title rather than DialogTitle. */
  "aria-labelledby"?: string | undefined;
  children: React.ReactNode;
}) {
  const focus = {
    ...(initialFocus === undefined ? {} : { initialFocus }),
    ...(finalFocus === undefined ? {} : { finalFocus }),
    ...(labelledBy === undefined ? {} : { "aria-labelledby": labelledBy }),
  };
  const { shape, kind } = useDialogContext("DialogContent");
  if (shape === "touch" && kind === "place") {
    return (
      <DrawerContent
        {...focus}
        // The whole screen, edge to edge on a tablet too, with square corners that meet the display's own.
        className="data-[swipe-direction=left]:rounded-none data-[swipe-direction=right]:rounded-none data-[swipe-axis=x]:[--drawer-content-width:100%] data-[swipe-axis=x]:sm:[--drawer-content-width:100%]"
      >
        <div
          data-slot="dialog-content"
          className="mx-auto grid w-full max-w-md min-w-0 grid-cols-[minmax(0,1fr)] gap-4 px-5 pt-[max(env(safe-area-inset-top),16px)] pb-5"
        >
          <PlaceShapeContext.Provider value="screen">{children}</PlaceShapeContext.Provider>
        </div>
      </DrawerContent>
    );
  }
  if (shape === "touch") {
    return (
      <DrawerContent {...focus}>
        {/* One column that never grows past the drawer, so a long unbroken value truncates instead. */}
        <div
          data-slot="dialog-content"
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 px-4 pt-2 pb-5"
        >
          {children}
        </div>
      </DrawerContent>
    );
  }
  const backdrop = (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className="fixed inset-0 isolate z-(--z-backdrop) bg-scrim transition-opacity duration-200 ease-(--ease-out) data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-140"
    />
  );
  if (placement === "end") {
    return (
      <DialogPrimitive.Portal data-slot="dialog-portal">
        {backdrop}
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          data-placement="end"
          {...focus}
          className={cn(
            // Slides in from the end edge over 260 ms and out in 200; under reduced motion it fades.
            "fixed inset-y-0 end-0 z-(--z-sheet) flex w-[min(92vw,400px)] flex-col overflow-y-auto overscroll-contain bg-plate text-text shadow-[-1px_0_0_var(--edge-2)] outline-none transition-[opacity,translate] duration-260 ease-(--ease-out) rtl:shadow-[1px_0_0_var(--edge-2)] data-starting-style:translate-x-full data-ending-style:translate-x-full data-ending-style:duration-200 rtl:data-starting-style:-translate-x-full rtl:data-ending-style:-translate-x-full motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:translate-x-0 motion-reduce:data-ending-style:opacity-0",
            className,
          )}
        >
          <PlaceShapeContext.Provider value="sheet">{children}</PlaceShapeContext.Provider>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    );
  }
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      {backdrop}
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        {...focus}
        className={cn(
          // The card's 6 px rise over 200 ms, leaving in 140.
          "edge-2 fixed inset-0 z-(--z-sheet) m-auto grid h-fit max-h-[85dvh] w-[min(92vw,420px)] scroll-pb-24 gap-4 overflow-y-auto overscroll-contain rounded-xl bg-plate p-5 text-text outline-none transition-[opacity,translate,scale] duration-200 ease-(--ease-out) data-starting-style:translate-y-1.5 data-starting-style:scale-99 data-starting-style:opacity-0 data-ending-style:translate-y-1.5 data-ending-style:scale-99 data-ending-style:opacity-0 data-ending-style:duration-140 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:scale-100",
          className,
        )}
      >
        <PlaceShapeContext.Provider value="dialog">{children}</PlaceShapeContext.Provider>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return useDialogShape("DialogHeader") === "desktop" ? (
    <div data-slot="dialog-header" className={cn("grid gap-2", className)} {...props} />
  ) : (
    <DrawerHeader data-slot="dialog-header" className={cn("gap-2 p-0", className)} {...props} />
  );
}

/** Actions, primary last: a row on a desktop, stacked full width with the primary on top on touch. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return useDialogShape("DialogFooter") === "desktop" ? (
    <div
      data-slot="dialog-footer"
      className={cn("mt-1 flex flex-row justify-end gap-2", className)}
      {...props}
    />
  ) : (
    <DrawerFooter
      data-slot="dialog-footer"
      className={cn("mt-1 flex-col-reverse p-0 *:h-11 *:w-full", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return useDialogShape("DialogTitle") === "desktop" ? (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-medium text-text", className)}
      {...props}
    />
  ) : (
    // Pinned to the top of the drawer, so scrolling the form, or the keyboard revealing a field,
    // never carries the title off the screen.
    <DrawerTitle
      data-slot="dialog-title"
      className={cn("sticky top-0 z-10 -mx-4 -mt-2 bg-plate px-4 pt-2 pb-1", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return useDialogShape("DialogDescription") === "desktop" ? (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-base text-text-2", className)}
      {...props}
    />
  ) : (
    <DrawerDescription data-slot="dialog-description" className={className} {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  usePlaceShape,
};
