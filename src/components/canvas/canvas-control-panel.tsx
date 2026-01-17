import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { fanConfigAtom, repulsionConfigAtom } from "@/context/atoms";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import { DEFAULT_REPULSION_CONFIG } from "@/lib/repulsion";
import { Slider } from "../ui/slider";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "../ui/tabs";
import { CanvasControlResetButton } from "./canvas-control-reset-button";

const toSingleNumber = (value: number | readonly number[]) =>
  (Array.isArray(value) ? value[0] : value) ?? 0;

export const CanvasControlPanel = () => {
  const [config, setConfig] = useAtom(repulsionConfigAtom);
  const [fanConfig, setFanConfig] = useAtom(fanConfigAtom);

  // Calculate transform for each card in the fan preview
  const calculateCardTransform = (index: number, isCover: boolean) => {
    if (isCover) {
      return { rotate: 0, x: 0, y: 0 };
    }

    // Calculate row and column (max 3 per row, matching card-group.tsx)
    const cardIndex = index - 1; // Subtract cover card
    const row = Math.floor(cardIndex / 3);
    const colInRow = cardIndex % 3;

    // Apply fan formulas from card-group.tsx, scaled down for preview
    const SCALE = 0.15; // Scale factor for preview area
    const rotate = (colInRow + 1) * fanConfig.rotateStepDeg;
    const arcY = (colInRow + 1) ** 2 * fanConfig.arcStepPx * SCALE;
    const gapX = (colInRow + 1) * fanConfig.expandGapPx * SCALE;
    const gapY = row * fanConfig.expandRowGapPx * SCALE;

    return { rotate, x: gapX, y: arcY + gapY };
  };

  const isRepulsionModified =
    config.radiusPx !== DEFAULT_REPULSION_CONFIG.radiusPx ||
    config.strengthPx !== DEFAULT_REPULSION_CONFIG.strengthPx;

  const isFanModified =
    fanConfig.rotateStepDeg !== DEFAULT_FAN_CONFIG.rotateStepDeg ||
    fanConfig.arcStepPx !== DEFAULT_FAN_CONFIG.arcStepPx ||
    fanConfig.expandGapPx !== DEFAULT_FAN_CONFIG.expandGapPx ||
    fanConfig.expandRowGapPx !== DEFAULT_FAN_CONFIG.expandRowGapPx;

  const handleResetRepulsion = () => {
    setConfig({ ...DEFAULT_REPULSION_CONFIG });
  };

  const handleResetFan = () => {
    setFanConfig({ ...DEFAULT_FAN_CONFIG });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-background2 outline outline-border">
      <Tabs>
        <TabsList className="px-3 pt-3">
          <TabsTrigger value="repulsion">Repulsion</TabsTrigger>
          <TabsTrigger value="visual">Fan</TabsTrigger>
        </TabsList>
        <TabsPanel value="repulsion">
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

          <div className="px-4 pb-4">
            <CanvasControlResetButton
              disabled={!isRepulsionModified}
              onClick={handleResetRepulsion}
            />
          </div>
        </TabsPanel>

        <TabsPanel value="visual">
          <div className="relative h-48 w-60 bg-background3 p-4">
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-start justify-center">
              {/* Cover card - index 0 */}
              <motion.div
                animate={calculateCardTransform(0, true)}
                className="size-8 rounded-md bg-accent/10 outline outline-accent"
                style={{ transformOrigin: "center center" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <div className="flex flex-col">
                <div className="flex">
                  {/* Row 1, Card 1 - index 1 */}
                  <motion.div
                    animate={calculateCardTransform(1, false)}
                    className="size-8 rounded-md bg-accent/10 outline outline-accent"
                    style={{ transformOrigin: "center center" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  {/* Row 1, Card 2 - index 2 */}
                  <motion.div
                    animate={calculateCardTransform(2, false)}
                    className="size-8 rounded-md bg-accent/10 outline outline-accent"
                    style={{ transformOrigin: "center center" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  {/* Row 1, Card 3 - index 3 */}
                  <motion.div
                    animate={calculateCardTransform(3, false)}
                    className="size-8 rounded-md bg-accent/10 outline outline-accent"
                    style={{ transformOrigin: "center center" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>
                <div className="flex">
                  {/* Row 2, Card 1 - index 4 */}
                  <motion.div
                    animate={calculateCardTransform(4, false)}
                    className="size-8 rounded-md bg-accent/10 outline outline-accent"
                    style={{ transformOrigin: "center center" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  {/* Row 2, Card 2 - index 5 */}
                  <motion.div
                    animate={calculateCardTransform(5, false)}
                    className="size-8 rounded-md bg-accent/10 outline outline-accent"
                    style={{ transformOrigin: "center center" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  {/* Row 2, Card 3 - index 6 */}
                  <motion.div
                    animate={calculateCardTransform(6, false)}
                    className="size-8 rounded-md bg-accent/10 outline outline-accent"
                    style={{ transformOrigin: "center center" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 pt-4 pb-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="rotate-slider"
                >
                  Rotation step
                </label>
                <span className="font-medium text-foreground2 text-sm">
                  {fanConfig.rotateStepDeg}°
                </span>
              </div>
              <Slider
                max={10}
                min={0}
                onValueChange={(value) =>
                  setFanConfig({
                    ...fanConfig,
                    rotateStepDeg: toSingleNumber(value),
                  })
                }
                step={0.5}
                value={fanConfig.rotateStepDeg}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="arc-slider"
                >
                  Arc step
                </label>
                <span className="font-medium text-foreground2 text-sm">
                  {fanConfig.arcStepPx}px
                </span>
              </div>
              <Slider
                max={20}
                min={0}
                onValueChange={(value) =>
                  setFanConfig({
                    ...fanConfig,
                    arcStepPx: toSingleNumber(value),
                  })
                }
                step={1}
                value={fanConfig.arcStepPx}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="h-gap-slider"
                >
                  Horizontal gap
                </label>
                <span className="font-medium text-foreground2 text-sm">
                  {fanConfig.expandGapPx}px
                </span>
              </div>
              <Slider
                max={100}
                min={-100}
                onValueChange={(value) =>
                  setFanConfig({
                    ...fanConfig,
                    expandGapPx: toSingleNumber(value),
                  })
                }
                step={1}
                value={fanConfig.expandGapPx}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="v-gap-slider"
                >
                  Vertical gap
                </label>
                <span className="font-medium text-foreground2 text-sm">
                  {fanConfig.expandRowGapPx}px
                </span>
              </div>
              <Slider
                max={100}
                min={-100}
                onValueChange={(value) =>
                  setFanConfig({
                    ...fanConfig,
                    expandRowGapPx: toSingleNumber(value),
                  })
                }
                step={1}
                value={fanConfig.expandRowGapPx}
              />
            </div>
          </div>

          <div className="px-4 pb-4">
            <CanvasControlResetButton
              onClick={handleResetFan}
              disabled={!isFanModified}
            />
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
};
