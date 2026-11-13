import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { useMemo } from "react";
import { tw } from "@/lib/utils";

function Slider({
  className,
  children,
  defaultValue,
  value,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = useMemo(() => {
    if (value !== undefined) {
      return Array.isArray(value) ? value : [value];
    }
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [min];
  }, [value, defaultValue, min]);

  return (
    <SliderPrimitive.Root
      className="data-[orientation=horizontal]:w-full"
      defaultValue={defaultValue}
      max={max}
      min={min}
      thumbAlignment="edge"
      value={value}
      {...props}
    >
      {children}
      <SliderPrimitive.Control
        className={tw(
          "flex touch-none select-none data-disabled:pointer-events-none data-disabled:opacity-64 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:min-w-44 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:flex-col",
          className
        )}
        data-slot="slider-control"
      >
        <SliderPrimitive.Track
          className="before:bg-background4 relative grow select-none before:absolute before:rounded-full data-[orientation=horizontal]:h-5 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=vertical]:before:inset-y-0.5"
          data-slot="slider-track"
        >
          <SliderPrimitive.Indicator
            className="bg-primary rounded-full select-none data-[orientation=horizontal]:ms-0.5 data-[orientation=vertical]:mb-0.5"
            data-slot="slider-indicator"
          />
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              className="border-input block size-5 shrink-0 rounded-full border bg-white outline-none select-none not-dark:bg-clip-padding before:absolute before:inset-0 before:rounded-full"
              data-slot="slider-thumb"
              key={String(index)}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

function SliderValue({ className, ...props }: SliderPrimitive.Value.Props) {
  return (
    <SliderPrimitive.Value
      className={tw("flex justify-end text-sm", className)}
      data-slot="slider-value"
      {...props}
    />
  );
}

export { Slider, SliderValue };
