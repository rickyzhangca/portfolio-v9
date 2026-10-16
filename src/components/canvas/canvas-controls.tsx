import {
  ArrowUUpLeftIcon,
  ClockCounterClockwiseIcon,
  LightbulbIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { useAtom } from "jotai";
import { type ComponentType, useCallback, useState } from "react";
import { isDeskLampSupported } from "@/components/lighting/desk-lamp";
import {
  ToolbarButton,
  ToolbarGroup,
  ToolbarLink,
  ToolbarList,
  ToolbarPanel,
  ToolbarRoot,
  ToolbarSeparator,
  ToolbarTrigger,
} from "@/components/toolbar/toolbar";
import { deskLampAtom } from "@/context/atoms";
import { AnalyticsEvents, track } from "@/lib/analytics";

const loadControlPanel = () =>
  import("./canvas-control-panel").then((module) => module.CanvasControlPanel);

const PLAYGROUND = "playground";
const ICON_SIZE = 16;

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
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [isLampOn, setLampOn] = useAtom(deskLampAtom);
  const [canLight] = useState(isDeskLampSupported);
  const toggleLamp = useCallback(() => setLampOn((on) => !on), [setLampOn]);
  // Fetch the playground while the pointer heads for it, so the blob opens
  // straight to its content. Kept in state rather than React.lazy, which
  // suspends once even for a loaded chunk and made the first open grow twice.
  const [ControlPanel, setControlPanel] = useState<ComponentType | null>(null);
  const preloadPanel = useCallback(() => {
    loadControlPanel().then((panel) => setControlPanel(() => panel));
  }, []);
  const handlePanelChange = useCallback(
    (next: string | null) => {
      if (next !== null) {
        preloadPanel();
      }
      setOpenPanel(next);
    },
    [preloadPanel]
  );

  const handleReset = () => {
    track(AnalyticsEvents.CANVAS_VIEW_RESET, { zoom_level: 1 });
    track(AnalyticsEvents.CANVAS_POSITION_RESET);
    onReset();
    onResetPositions();
  };

  return (
    <div className="no-pan fixed right-3 bottom-3 z-50" data-no-collapse>
      <ToolbarRoot
        onValueChange={handlePanelChange}
        side="left"
        value={openPanel}
      >
        <ToolbarList aria-label="Canvas controls">
          {canLight ? (
            <ToolbarGroup aria-label="Lighting">
              <ToolbarButton
                active={isLampOn}
                aria-pressed={isLampOn}
                label="Realistic lighting"
                onClick={toggleLamp}
              >
                <LightbulbIcon
                  size={ICON_SIZE}
                  weight={isLampOn ? "fill" : "regular"}
                />
              </ToolbarButton>
            </ToolbarGroup>
          ) : null}
          <ToolbarGroup aria-label="Canvas">
            <ToolbarTrigger
              label="Open playground"
              onFocus={preloadPanel}
              onPointerEnter={preloadPanel}
              value={PLAYGROUND}
            >
              <SlidersHorizontalIcon size={ICON_SIZE} />
            </ToolbarTrigger>
            <ToolbarSeparator />
            <ToolbarButton
              disabled={isResetDisabled}
              label="Reset canvas"
              onClick={handleReset}
            >
              <ArrowUUpLeftIcon size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarLink
              href="https://v8.rickyzhang.me"
              label="Time machine"
              rel="noopener noreferrer"
              target="_blank"
            >
              <ClockCounterClockwiseIcon size={ICON_SIZE} />
            </ToolbarLink>
          </ToolbarGroup>
        </ToolbarList>
        <ToolbarPanel label="Playground" value={PLAYGROUND}>
          {ControlPanel ? (
            <ControlPanel />
          ) : (
            <div className="w-60 px-4 py-3" role="status">
              Loading playground...
            </div>
          )}
        </ToolbarPanel>
      </ToolbarRoot>
    </div>
  );
};
