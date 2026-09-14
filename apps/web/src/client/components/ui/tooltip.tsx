import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";
import * as React from "react";

/*
 * shadcn's Tooltip on Base UI: a visual name for a control whose accessible name it repeats, so
 * the popup is hidden from assistive technology; timing and behaviour are DESIGN.md's tooltip
 * paragraph, ADR 0017.
 */

const DELAY = 500;
/** Moving from one control to the next inside this window skips the delay and the fade. */
const WARM = 400;

function TooltipProvider({
  delay = DELAY,
  timeout = WARM,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      timeout={timeout}
      {...props}
    />
  );
}

/** A name never holds a control, so the pointer passes through it and it closes on the way out. */
function Tooltip({
  disableHoverablePopup = true,
  onOpenChange,
  actionsRef,
  children,
  ...props
}: TooltipPrimitive.Root.Props) {
  const ownActions = React.useRef<TooltipPrimitive.Root.Actions | null>(null);
  const actions = actionsRef ?? ownActions;
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      disableHoverablePopup={disableHoverablePopup}
      actionsRef={actions}
      onOpenChange={(open, details) => {
        // Base UI would swallow the key; letting it through closes the dialog around the control too.
        if (details.reason === "escape-key") {
          details.cancel();
          details.allowPropagation();
          queueMicrotask(() => actions.current?.close());
        }
        onOpenChange?.(open, details);
      }}
      {...props}
    >
      {children}
    </TooltipPrimitive.Root>
  );
}

/** Compose the control through `render`: `<TooltipTrigger render={<button type="button" />} />`. */
function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={8}
        className="isolate z-(--z-tooltip)"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          aria-hidden="true"
          className={cn(
            // Grows out of the side nearest its control: in over 120 ms, out in 80, at once along a row.
            "pointer-events-none w-max max-w-60 origin-(--transform-origin) rounded-xs bg-text px-2 py-1 text-xs font-medium text-canvas transition-[opacity,translate,scale] duration-80 ease-(--ease-out) [--tip-y:-2px] data-open:duration-120 data-[instant=delay]:duration-0 data-[side=top]:[--tip-y:2px] data-starting-style:translate-y-(--tip-y) data-starting-style:scale-97 data-starting-style:opacity-0 data-ending-style:translate-y-(--tip-y) data-ending-style:scale-97 data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:scale-100",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
