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
} from "./drawer";

/*
 * shadcn's Dialog, in the shape of the machine: centred on a desktop, a drawer from the bottom edge
 * on a touch device, for a form and a question alike. Every part below renders both shapes, so a
 * call site never asks which machine it is on. Lymi drops the generated corner close button: its
 * dialogs end in explicit actions. ADR 0017.
 */

type Shape = "desktop" | "touch";

const DialogShapeContext = React.createContext<Shape | null>(null);

function useDialogShape(part: string) {
  const shape = React.useContext(DialogShapeContext);
  if (!shape) throw new Error(`${part} must be used within a Dialog.`);
  return shape;
}

function Dialog({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
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
  return (
    <DialogShapeContext.Provider value={shape}>
      {shape === "desktop" ? (
        <DialogPrimitive.Root data-slot="dialog" open={open} onOpenChange={setOpen}>
          {children}
        </DialogPrimitive.Root>
      ) : (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          {children}
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
  children,
}: {
  className?: string | undefined;
  /** Where focus lands on opening, when the first control is not the safe one. */
  initialFocus?: DialogPrimitive.Popup.Props["initialFocus"];
  children: React.ReactNode;
}) {
  const focus = initialFocus === undefined ? {} : { initialFocus };
  if (useDialogShape("DialogContent") === "touch") {
    return (
      <DrawerContent {...focus}>
        <div data-slot="dialog-content" className={cn("grid gap-4 px-4 pt-2 pb-5", className)}>
          {children}
        </div>
      </DrawerContent>
    );
  }
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 isolate z-(--z-backdrop) bg-scrim transition-opacity duration-200 ease-(--ease-out) data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-140"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        {...focus}
        className={cn(
          // The card's 6 px rise over 200 ms, leaving in 140.
          "edge-2 fixed inset-0 z-(--z-sheet) m-auto grid h-fit max-h-[85dvh] w-[min(92vw,420px)] gap-4 overflow-y-auto overscroll-contain rounded-xl bg-plate p-5 text-text outline-none transition-[opacity,translate,scale] duration-200 ease-(--ease-out) data-starting-style:translate-y-1.5 data-starting-style:scale-99 data-starting-style:opacity-0 data-ending-style:translate-y-1.5 data-ending-style:scale-99 data-ending-style:opacity-0 data-ending-style:duration-140 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:scale-100",
          className,
        )}
      >
        {children}
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
    <DrawerTitle data-slot="dialog-title" className={className} {...props} />
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
};
