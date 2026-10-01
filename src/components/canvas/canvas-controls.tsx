import {
  ArrowUUpLeftIcon,
  ClockCounterClockwiseIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { lazy, Suspense, useCallback, useState } from "react";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { CanvasControlButton } from "./canvas-control-button";

const CanvasControlPanel = lazy(() =>
  import("./canvas-control-panel").then((module) => ({
    default: module.CanvasControlPanel,
  }))
);

interface CanvasControlsProps {
  isResetDisabled?: boolean;
  onReset: () => void;
  onResetPositions: () => void;
}

export const CanvasControls = ({
  onReset,
  isResetDisabled,
  onResetPositions,
}: CanvasControlsProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const togglePanel = useCallback(() => setIsPanelOpen((open) => !open), []);

  const handleReset = () => {
    track(AnalyticsEvents.CANVAS_VIEW_RESET, { zoom_level: 1 });
    track(AnalyticsEvents.CANVAS_POSITION_RESET);
    onReset();
    onResetPositions();
  };

  return (
    <div className="no-pan fixed right-3 bottom-3 z-50 flex flex-col items-end justify-end gap-2">
      {isPanelOpen ? (
        <Suspense
          fallback={
            <div
              className="rounded-3xl bg-background2 px-4 py-3 text-sm outline outline-border"
              data-no-collapse
              role="status"
            >
              Loading playground...
            </div>
          }
        >
          <CanvasControlPanel />
        </Suspense>
      ) : null}
      <div
        className="flex flex-col rounded-full bg-background2 p-1 outline outline-border"
        data-no-collapse
      >
        <CanvasControlButton
          Icon={SlidersHorizontalIcon}
          label="Open playground"
          onClick={togglePanel}
        />
        <CanvasControlButton
          disabled={isResetDisabled}
          Icon={ArrowUUpLeftIcon}
          label="Reset canvas"
          onClick={handleReset}
        />
        <a
          href="https://v8.rickyzhang.me"
          rel="noopener noreferrer"
          target="_blank"
        >
          <CanvasControlButton
            Icon={ClockCounterClockwiseIcon}
            label="Time machine"
          />
        </a>
      </div>
    </div>
  );
};
