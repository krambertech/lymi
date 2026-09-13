import { type ToastManagerAddOptions, Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cn } from "cn";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";

const manager = ToastPrimitive.createToastManager();

interface ToastOptions extends Omit<ToastManagerAddOptions<object>, "type" | "priority"> {
  /** An error is announced at once; every other toast waits for the reader to pause. */
  type?: "error" | undefined;
}

const toast = {
  add: ({ type, ...options }: ToastOptions) =>
    manager.add({ ...options, type, priority: type === "error" ? "high" : "low" }),
  close: manager.close,
};

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        // Clears the phone's pill nav; the rail replaces the pill at the same 768 px window. A toast
        // travels this inset too, so it enters and leaves from below the screen's edge.
        "pointer-events-none fixed inset-x-4 bottom-(--toast-inset) z-(--z-toast) mx-auto w-auto max-w-sm outline-none [--toast-inset:calc(env(safe-area-inset-bottom)+80px)] sm:end-4 sm:start-auto sm:mx-0 sm:w-full md:[--toast-inset:1rem]",
        className,
      )}
      {...props}
    />
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute end-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-md bg-text text-canvas inset-ring inset-ring-canvas/25 will-change-transform select-none",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
        "after:absolute after:start-0 after:top-full after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(calc(150%+var(--toast-inset,0px)))]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(calc(150%+var(--toast-inset,0px)))]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%+var(--toast-inset,0px)))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%+var(--toast-inset,0px)))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium text-pretty", className)}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-canvas/70", className)}
      {...props}
    />
  );
}

function ToastAction({ className, ...props }: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "relative shrink-0 rounded-sm px-2.5 py-1.5 text-sm font-semibold text-toast-action transition-[background-color,scale] duration-150 before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] hoverable:hover:bg-canvas/10 active:scale-[0.97]",
        className,
      )}
      {...props}
    />
  );
}

function ToastClose({ className, children, ...props }: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn(
        "relative grid size-7 shrink-0 place-items-center rounded-sm text-canvas/60 transition-colors duration-150 after:absolute after:-inset-2 after:content-[''] hoverable:hover:bg-canvas/10 hoverable:hover:text-canvas [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null;

  if (type === "success") icon = <CircleCheckIcon aria-hidden="true" />;
  if (type === "info") icon = <InfoIcon aria-hidden="true" />;
  if (type === "warning") icon = <TriangleAlertIcon aria-hidden="true" />;
  if (type === "error") icon = <OctagonXIcon aria-hidden="true" />;
  if (type === "loading") icon = <Loader2Icon className="animate-spin" aria-hidden="true" />;

  if (!icon) return null;

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
    >
      {icon}
    </span>
  );
}

function ToastList({
  closeLabel,
  className,
}: {
  closeLabel: string;
  className?: string | undefined;
}) {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem} className={className}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose aria-label={closeLabel} />
      </ToastContent>
    </Toast>
  ));
}

function Toaster({
  children,
  label,
  closeLabel,
  toastManager = manager,
  ...props
}: ToastPrimitive.Provider.Props & { label: string; closeLabel: string }) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport aria-label={label}>
          <ToastList closeLabel={closeLabel} />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;

export {
  createToastManager,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  Toaster,
  ToastList,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toast,
};
