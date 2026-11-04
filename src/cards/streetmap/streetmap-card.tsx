import { useAtomValue } from "jotai";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { StreetmapCardContent } from "@/cards/registry";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { useCanvasEnvironment } from "@/context/canvas-layout";
import { deskLampAtom } from "@/context/atoms";
import { whenPageIdle } from "@/hooks/page-idle";
import { FOLD_PARAMS, PANEL_HEIGHT, PANEL_WIDTH } from "@/lib/map-fold";
import { tw } from "@/lib/utils";

const loadSheet = () => import("./streetmap-sheet");
const StreetmapSheet = lazy(() =>
  loadSheet().then((module) => ({ default: module.StreetmapSheet }))
);

/**
 * The rest of the folded sheet peeking out under the cover, in px and deg:
 * sixteen layers of paper are never trimmed to one edge.
 */
const STACK_LAYERS = [
  { key: "deep", turn: 0.35, x: 1.4, y: 2.1 },
  { key: "middle", turn: -0.25, x: 1.9, y: 1.1 },
  { key: "near", turn: 0.15, x: 0.7, y: 1.5 },
] as const;

/** Paper grain: fractal noise, tiled. */
const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.2 0 0 0 0 0.15 0 0 0 0 0.05 0 0 0 1.6 -0.5"/></filter><rect width="96" height="96" filter="url(#g)"/></svg>'
)}")`;

interface StreetmapCardProps {
  content: StreetmapCardContent;
  isFocused?: boolean;
}

/**
 * A folded street map of Tiny Toronto. On the desk it is its cover; focused,
 * it lifts, unfolds into a live map that drags and zooms, and folds back
 * down when let go.
 */
export const StreetmapCard = ({
  content,
  isFocused = false,
}: StreetmapCardProps) => {
  const isLampOn = useAtomValue(deskLampAtom);
  const { layout } = useCanvasEnvironment();
  // Square on a desk; a little askew in a phone's single column.
  const tilt = layout.compact ? FOLD_PARAMS.restTilt : 0;
  const [isUnfolding, setUnfolding] = useState(false);
  const [isSheetReady, setSheetReady] = useState(false);
  // Mounted from the moment it is focused until it has folded back down.
  if (isFocused && !isUnfolding) {
    setUnfolding(true);
  }

  useEffect(() => {
    let cancelled = false;
    whenPageIdle()
      .then(() => (cancelled ? undefined : loadSheet()))
      .catch(() => {
        // Retried when the map is opened.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const prefetch = useCallback(() => {
    loadSheet().then(
      (module) => module.prefetchStreetmap(content, layout.compact),
      () => {
        // Retried when the map is opened.
      }
    );
  }, [content, layout.compact]);
  const handleReady = useCallback(() => setSheetReady(true), []);
  const handleClosed = useCallback(() => {
    setUnfolding(false);
    setSheetReady(false);
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hovering only prefetches the map; the item around it is the button.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: as above.
    <div
      className="relative"
      onFocus={prefetch}
      onPointerEnter={prefetch}
      style={{ height: PANEL_HEIGHT, width: PANEL_WIDTH }}
    >
      {isSheetReady ? null : (
        <div
          className={tw(
            "absolute inset-0",
            !isLampOn &&
              "transition-[filter] duration-200 [filter:drop-shadow(0_0.5px_0.75px_rgba(20,14,8,0.28))_drop-shadow(0_5px_9px_rgba(20,14,8,0.14))] hover:[filter:drop-shadow(0_1px_1px_rgba(20,14,8,0.22))_drop-shadow(0_10px_16px_rgba(20,14,8,0.2))]"
          )}
          data-lamp-contact={isLampOn ? "" : undefined}
          data-lamp-shadow={isLampOn ? LAMP_LIFT.card : undefined}
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          {/* The folded sheet under the cover: its layers never quite line up. */}
          {STACK_LAYERS.map((layer) => (
            <div
              aria-hidden
              className="absolute inset-0 rounded-[1px] bg-[linear-gradient(135deg,#f6f2e7,#e6dfcd)] shadow-[0_0_0_0.5px_rgba(60,48,30,0.22)]"
              key={layer.key}
              style={{
                transform: `translate(${layer.x}px, ${layer.y}px) rotate(${layer.turn}deg)`,
              }}
            />
          ))}
          <div className="absolute inset-0 overflow-hidden rounded-[1px] bg-[#ffd21f] shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]">
            <img
              alt="Tiny Toronto street map"
              className="pointer-events-none h-full w-full select-none"
              decoding="async"
              draggable={false}
              height={PANEL_HEIGHT}
              sizes={`${PANEL_WIDTH}px`}
              src={content.cover}
              srcSet={`${content.cover2x} 240w, ${content.cover} 360w`}
              width={PANEL_WIDTH}
            />
            {/* Card stock: a fine grain, and a sheet that bulges a little. */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: PAPER_GRAIN, backgroundSize: "96px" }}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.14),rgba(255,255,255,0)_38%,rgba(0,0,0,0)_62%,rgba(40,28,10,0.08))]"
            />
            {/* Fold edges: the left and the bottom round over, the right is cut. */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px] bg-[linear-gradient(90deg,rgba(40,28,10,0.22),rgba(255,255,255,0.22)_55%,rgba(255,255,255,0))]"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[4px] bg-[linear-gradient(0deg,rgba(40,28,10,0.24),rgba(40,28,10,0.06)_45%,rgba(255,255,255,0.12)_70%,rgba(255,255,255,0))]"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0))]"
            />
            <div
              aria-hidden
              className="absolute inset-y-0 right-0 w-px bg-[rgba(40,28,10,0.14)]"
            />
          </div>
        </div>
      )}
      {isUnfolding ? (
        <Suspense fallback={null}>
          <StreetmapSheet
            compact={layout.compact}
            content={content}
            lampOn={isLampOn}
            onClosed={handleClosed}
            onReady={handleReady}
            open={isFocused}
            tilt={tilt}
          />
        </Suspense>
      ) : null}
    </div>
  );
};
