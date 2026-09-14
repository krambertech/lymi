import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "cn";

/*
 * shadcn's Popover on Base UI, anchored on every device. It has no drawer shape, so it holds a note
 * about a control and never controls of its own; ADR 0017.
 */

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverContent({
  className,
  anchor,
  align = "center",
  alignOffset = 0,
  side = "top",
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "anchor" | "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        anchor={anchor}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={12}
        className="isolate z-(--z-tooltip)"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            // Grows out of the side nearest its control over 180 ms and shrinks back into it in 100.
            "edge-2 w-max max-w-64 origin-(--transform-origin) rounded-md bg-plate px-3 py-2 text-start text-sm text-text outline-none transition-[opacity,translate,scale] duration-100 ease-(--ease-out) [--pop-y:-4px] data-open:duration-180 data-[side=top]:[--pop-y:4px] data-starting-style:translate-y-(--pop-y) data-starting-style:scale-98 data-starting-style:opacity-0 data-ending-style:translate-y-(--pop-y) data-ending-style:scale-98 data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:scale-100",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent };
