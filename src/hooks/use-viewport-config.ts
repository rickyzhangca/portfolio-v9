import { useCallback, useMemo } from "react";
import type { CanvasItem } from "@/types/canvas";

interface ViewportDimensions {
  width: number;
  height: number;
}

interface RepulsionConfig {
  radiusPx: number;
  strengthPx: number;
}

interface UseViewportConfigOptions {
  viewportDimensions: ViewportDimensions;
  baseRepulsionConfig: RepulsionConfig;
}

/**
 * Hook to compute viewport-proportional configuration values.
 * Centralizes responsive calculations that depend on viewport size.
 */
export const useViewportConfig = ({
  viewportDimensions,
  baseRepulsionConfig,
}: UseViewportConfigOptions) => {
  // Calculate viewport-proportional repulsion values for doc modal mode
  const getModalRepulsionConfig = useCallback(
    (viewportWidth: number, viewportHeight: number): RepulsionConfig => {
      const maxDimension = Math.max(viewportWidth, viewportHeight);

      return {
        radiusPx: maxDimension * 2.5,
        strengthPx: maxDimension * 0.5,
      };
    },
    []
  );

  const effectiveRepulsionConfig = useMemo(() => {
    const modalConfig = getModalRepulsionConfig(
      viewportDimensions.width,
      viewportDimensions.height
    );

    return {
      radiusPx: Math.max(baseRepulsionConfig.radiusPx, modalConfig.radiusPx),
      strengthPx: Math.max(
        baseRepulsionConfig.strengthPx,
        modalConfig.strengthPx
      ),
    };
  }, [baseRepulsionConfig, viewportDimensions, getModalRepulsionConfig]);

  return {
    getModalRepulsionConfig,
    effectiveRepulsionConfig,
  };
};

/**
 * Hook to check if item positions have been modified from initial state.
 */
export const useArePositionsModified = (
  currentItems: Map<string, CanvasItem>,
  initialItems: CanvasItem[]
): boolean => {
  return useMemo(() => {
    const initialMap = new Map(
      initialItems.map((item) => [item.id, item.position])
    );

    for (const [id, item] of currentItems) {
      const initialPos = initialMap.get(id);
      if (!initialPos) {
        return true;
      }
      if (
        item.position.x !== initialPos.x ||
        item.position.y !== initialPos.y
      ) {
        return true;
      }
    }
    return false;
  }, [currentItems, initialItems]);
};
