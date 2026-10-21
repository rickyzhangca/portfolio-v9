import { useAtom } from "jotai";
import { useCallback, useLayoutEffect, useRef } from "react";
import { lampConfigAtom } from "@/context/atoms";
import {
  DEFAULT_LAMP_CONFIG,
  LAMP_FOLLOW_RATE,
  type LampConfig,
} from "@/lib/lamp-config";
import {
  contactBoxShadow,
  lampShadowFilter,
  projectLampShadow,
} from "@/lib/lamp-shadow";
import { getRoomGradient } from "@/lib/room-gradient";
import { Slider } from "../ui/slider";
import { CanvasControlResetButton } from "./canvas-control-reset-button";

/**
 * The preview is a small desk, so lengths are scaled down to keep each
 * setting visible: the pool shrinks with the desk, and the lamp hangs
 * proportionally lower over cards standing proportionally higher, which
 * keeps the real shadows' proportions at a size that reads.
 */
const PREVIEW_POOL_SCALE = 0.12;
const PREVIEW_HEIGHT_SCALE = 0.25;
const PREVIEW_CARD_LIFT = 24;
const PREVIEW_CARDS = [
  { height: 34, width: 48, x: 22, y: 116 },
  { height: 34, width: 48, x: 150, y: 24 },
  { height: 34, width: 48, x: 166, y: 128 },
] as const;
/** Without a pointer over it, the lamp circles the desk. */
const ORBIT = { period: 7000, radiusX: 64, radiusY: 40, x: 120, y: 96 };
const IDENTITY = { a: 1, b: 0, c: 0, d: 1 };

const orbitAt = (time: number) => {
  const angle = (time / ORBIT.period) * Math.PI * 2;
  return {
    x: ORBIT.x + Math.cos(angle) * ORBIT.radiusX,
    y: ORBIT.y + Math.sin(angle) * ORBIT.radiusY,
  };
};

type LampSetting = keyof LampConfig;

interface LightSliderProps {
  format: (value: number) => string;
  label: string;
  max: number;
  min: number;
  onChange: (setting: LampSetting, value: number) => void;
  setting: LampSetting;
  step: number;
  value: number;
}

const LightSlider = ({
  format,
  label,
  max,
  min,
  onChange,
  setting,
  step,
  value,
}: LightSliderProps) => {
  const handleChange = useCallback(
    (next: number | readonly number[]) =>
      onChange(setting, (Array.isArray(next) ? next[0] : next) ?? min),
    [min, onChange, setting]
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="font-medium text-foreground2 text-sm">
          {format(value)}
        </span>
      </div>
      <Slider
        aria-label={label}
        max={max}
        min={min}
        onValueChange={handleChange}
        step={step}
        value={value}
      />
    </div>
  );
};

const formatPx = (value: number) => `${value}px`;
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * A small desk under the lamp, drawn with the same pool and shadows as the
 * canvas. The lamp trails the pointer over the preview, or an orbit without
 * one, at the configured follow speed. Painted each frame outside React.
 */
const LightPreview = ({ config }: { config: LampConfig }) => {
  const configRef = useRef(config);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<HTMLDivElement | null>(null);
  const lampRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    configRef.current = config;
  }, [config]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const isReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const cards = root.querySelectorAll<HTMLElement>("[data-preview-card]");
    const lamp = orbitAt(0);
    let pointer: { x: number; y: number } | null = null;
    let lastTime = 0;
    let frame = 0;

    const paint = () => {
      const { heightPx, poolRadiusPx, roomDim } = configRef.current;
      if (roomRef.current) {
        roomRef.current.style.background = getRoomGradient(
          { poolRadiusPx: poolRadiusPx * PREVIEW_POOL_SCALE, roomDim },
          `${lamp.x.toFixed(1)}px ${lamp.y.toFixed(1)}px`
        );
      }
      if (lampRef.current) {
        lampRef.current.style.transform = `translate(${lamp.x.toFixed(1)}px, ${lamp.y.toFixed(1)}px)`;
      }
      for (const [index, card] of PREVIEW_CARDS.entries()) {
        const element = cards[index];
        if (!element) {
          continue;
        }
        const shadow = projectLampShadow({
          center: { x: card.x + card.width / 2, y: card.y + card.height / 2 },
          lamp,
          lampHeight: heightPx * PREVIEW_HEIGHT_SCALE,
          lift: PREVIEW_CARD_LIFT,
          linear: IDENTITY,
        });
        element.style.filter = shadow ? lampShadowFilter(shadow) : "none";
        element.style.boxShadow = shadow ? contactBoxShadow(shadow) : "";
      }
    };

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      const elapsed = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      lastTime = time;
      const goal = pointer ?? (isReduced ? lamp : orbitAt(time));
      const follow = 1 - Math.exp(-elapsed * LAMP_FOLLOW_RATE);
      lamp.x += (goal.x - lamp.x) * follow;
      lamp.y += (goal.y - lamp.y) * follow;
      paint();
    };

    const handleMove = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect();
      pointer = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    };
    const handleLeave = () => {
      pointer = null;
    };

    paint();
    frame = requestAnimationFrame(tick);
    root.addEventListener("pointermove", handleMove);
    root.addEventListener("pointerleave", handleLeave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", handleMove);
      root.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <div
      className="relative h-48 w-60 overflow-hidden bg-background3"
      data-testid="light-preview"
      ref={rootRef}
    >
      <div className="absolute inset-0" ref={roomRef} />
      {PREVIEW_CARDS.map((card) => (
        <div
          className="absolute rounded-md bg-background2 outline outline-border"
          data-preview-card
          key={`${card.x} ${card.y}`}
          style={{
            height: card.height,
            left: card.x,
            top: card.y,
            width: card.width,
          }}
        />
      ))}
      <div
        className="absolute top-0 left-0 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background3 outline outline-accent"
        ref={lampRef}
      >
        <div className="size-full rounded-full bg-accent opacity-60" />
      </div>
    </div>
  );
};

/** The playground's Light tab: the desk lamp's tunable settings. */
export const CanvasControlLightPanel = () => {
  const [config, setConfig] = useAtom(lampConfigAtom);

  const handleChange = useCallback(
    (setting: LampSetting, value: number) =>
      setConfig((current) => ({ ...current, [setting]: value })),
    [setConfig]
  );
  const handleReset = useCallback(
    () => setConfig({ ...DEFAULT_LAMP_CONFIG }),
    [setConfig]
  );
  const isModified = (Object.keys(DEFAULT_LAMP_CONFIG) as LampSetting[]).some(
    (setting) => config[setting] !== DEFAULT_LAMP_CONFIG[setting]
  );

  return (
    <>
      <LightPreview config={config} />

      <div className="flex flex-col gap-4 px-4 pt-4 pb-5">
        <LightSlider
          format={formatPx}
          label="Height"
          max={480}
          min={120}
          onChange={handleChange}
          setting="heightPx"
          step={20}
          value={config.heightPx}
        />
        <LightSlider
          format={formatPx}
          label="Pool size"
          max={1600}
          min={400}
          onChange={handleChange}
          setting="poolRadiusPx"
          step={50}
          value={config.poolRadiusPx}
        />
        <LightSlider
          format={formatPercent}
          label="Room dim"
          max={2.5}
          min={0}
          onChange={handleChange}
          setting="roomDim"
          step={0.1}
          value={config.roomDim}
        />
      </div>

      <div className="px-4 pb-4">
        <CanvasControlResetButton
          disabled={!isModified}
          onClick={handleReset}
        />
      </div>
    </>
  );
};
