import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { useOverlayShape } from "../lib/device";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";

/*
 * The Dialog anatomy, in the shape of the machine: centred on a desktop, a drawer from the bottom
 * edge on a touch device, for a form and a question alike. ADR 0017.
 */

const ShapeCtx = createContext<"desktop" | "touch" | null>(null);

function useShape(part: string) {
  const shape = useContext(ShapeCtx);
  if (!shape) throw new Error(`${part} must be used within a ResponsiveDialog.`);
  return shape;
}

function ResponsiveDialog({
  open: controlled,
  onOpenChange,
  children,
}: {
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children: ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlled ?? uncontrolled;
  const setOpen = useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const shape = useOverlayShape(open);
  return (
    <ShapeCtx.Provider value={shape}>
      {shape === "desktop" ? (
        <Dialog open={open} onOpenChange={setOpen}>
          {children}
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          {children}
        </Drawer>
      )}
    </ShapeCtx.Provider>
  );
}

function ResponsiveDialogTrigger({ render }: { render: ReactElement }) {
  return useShape("ResponsiveDialogTrigger") === "desktop" ? (
    <DialogTrigger render={render} />
  ) : (
    <DrawerTrigger render={render} />
  );
}

function ResponsiveDialogClose({ render }: { render: ReactElement }) {
  return useShape("ResponsiveDialogClose") === "desktop" ? (
    <DialogClose render={render} />
  ) : (
    <DrawerClose render={render} />
  );
}

function ResponsiveDialogContent({
  className,
  initialFocus,
  children,
}: {
  className?: string | undefined;
  /** Where focus lands on opening, when the first control is not the safe one. */
  initialFocus?: DialogPrimitive.Popup.Props["initialFocus"];
  children: ReactNode;
}) {
  const focus = initialFocus === undefined ? {} : { initialFocus };
  return useShape("ResponsiveDialogContent") === "desktop" ? (
    <DialogContent className={className} {...focus}>
      {children}
    </DialogContent>
  ) : (
    <DrawerContent {...focus}>
      <div className={cn("grid gap-4 px-4 pt-2 pb-5", className)}>{children}</div>
    </DrawerContent>
  );
}

function ResponsiveDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return useShape("ResponsiveDialogHeader") === "desktop" ? (
    <DialogHeader className={className} {...props} />
  ) : (
    <DrawerHeader className={cn("gap-2 p-0", className)} {...props} />
  );
}

function ResponsiveDialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return useShape("ResponsiveDialogTitle") === "desktop" ? (
    <DialogTitle className={className} {...props} />
  ) : (
    <DrawerTitle className={className} {...props} />
  );
}

function ResponsiveDialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return useShape("ResponsiveDialogDescription") === "desktop" ? (
    <DialogDescription className={className} {...props} />
  ) : (
    <DrawerDescription className={className} {...props} />
  );
}

/** Actions, primary last: a row on a desktop, stacked full width with the primary on top on touch. */
function ResponsiveDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return useShape("ResponsiveDialogFooter") === "desktop" ? (
    <DialogFooter className={cn("flex-row justify-end", className)} {...props} />
  ) : (
    <DrawerFooter
      className={cn("mt-1 flex-col-reverse p-0 *:h-11 *:w-full", className)}
      {...props}
    />
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
