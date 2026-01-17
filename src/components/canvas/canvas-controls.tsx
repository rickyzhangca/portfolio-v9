import { ArrowUUpLeftIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CanvasControlButton } from "./canvas-control-button";
import { CanvasControlPanel } from "./canvas-control-panel";

interface CanvasControlsProps {
  onReset: () => void;
  isResetDisabled?: boolean;
}

export const CanvasControls = ({
  onReset,
  isResetDisabled,
}: CanvasControlsProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="no-pan fixed right-3 bottom-3 z-50 flex flex-col items-end justify-end gap-2">
      {isPanelOpen && <CanvasControlPanel />}
      <div
        className="flex flex-col rounded-full bg-background2 p-1 outline outline-border"
        data-no-collapse
      >
        <CanvasControlButton
          Icon={SlidersHorizontalIcon}
          onClick={() => setIsPanelOpen(!isPanelOpen)}
        />
        <CanvasControlButton
          disabled={isResetDisabled}
          Icon={ArrowUUpLeftIcon}
          onClick={onReset}
        />
      </div>
    </div>
  );
};
