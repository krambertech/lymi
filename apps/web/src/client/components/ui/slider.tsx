import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";

// shadcn's Slider: one value or a range along a track, in Lymi's ink.

function Slider<Value extends number | readonly number[]>({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  // Base UI's default of 10 is in value units, which crosses a 1 to 3 zoom in one Page Up.
  largeStep = (max - min) / 10,
  "aria-label": label,
  ...props
}: SliderPrimitive.Root.Props<Value>) {
  const thumbs: readonly unknown[] = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min];

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      largeStep={largeStep}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control
        // Dragging inside a phone's drawer must not swipe the drawer away.
        data-base-ui-swipe-ignore=""
        className="relative flex h-11 w-full touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-45 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-11 data-vertical:flex-col"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-edge select-none data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-text-2 select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {thumbs.map((_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            // biome-ignore lint/suspicious/noArrayIndexKey: a thumb is its position in the value, not an item
            key={index}
            aria-label={label}
            className={cn(
              "edge-2 relative block size-5 shrink-0 rounded-full bg-plate select-none transition-[scale] duration-150 ease-(--ease-out)",
              // A 44 px target around a 20 px thumb.
              "after:absolute after:-inset-3 after:content-['']",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
              "data-dragging:scale-110 motion-reduce:data-dragging:scale-100",
            )}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
