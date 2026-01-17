import { useAtom } from "jotai";
import { repulsionConfigAtom } from "@/context/atoms";
import { Slider } from "../ui/slider";

const toSingleNumber = (value: number | readonly number[]) =>
  (Array.isArray(value) ? value[0] : value) ?? 0;
export const CanvasControlPanel = () => {
  const [config, setConfig] = useAtom(repulsionConfigAtom);

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-background2 outline outline-border">
      <div className="relative h-48 w-60 bg-background3 p-4">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full outline outline-accent"
          style={{
            width: config.radiusPx / 13,
            height: config.radiusPx / 13,
            minWidth: 36,
            minHeight: 36,
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-size-[8px_8px] bg-fixed [--pattern-fg:var(--color-accent)]/20"
          style={{
            width: config.radiusPx / 13,
            height: config.radiusPx / 13,
            minWidth: 36,
            minHeight: 36,
          }}
        />
        <div className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background3 outline outline-accent" />
        <div
          className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{
            opacity: config.strengthPx / 5 / 100,
          }}
        />
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              className="text-muted-foreground text-sm"
              htmlFor="radius-slider"
            >
              Radius
            </label>
            <span className="font-medium text-foreground2 text-sm">
              {config.radiusPx}px
            </span>
          </div>
          <Slider
            max={2000}
            min={200}
            onValueChange={(value) =>
              setConfig({ ...config, radiusPx: toSingleNumber(value) })
            }
            step={100}
            value={config.radiusPx}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              className="text-muted-foreground text-sm"
              htmlFor="strength-slider"
            >
              Strength
            </label>
            <span className="font-medium text-foreground2 text-sm">
              {config.strengthPx}px
            </span>
          </div>
          <Slider
            max={500}
            min={0}
            onValueChange={(value) =>
              setConfig({ ...config, strengthPx: toSingleNumber(value) })
            }
            step={50}
            value={config.strengthPx}
          />
        </div>
      </div>
    </div>
  );
};
