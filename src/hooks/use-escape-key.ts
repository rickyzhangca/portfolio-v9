import { useEffect } from "react";

interface UseEscapeKeyOptions {
  isActive: boolean;
  onEscape: () => void;
  isLocked?: boolean;
}

/**
 * Hook to handle ESC key presses with optional locking.
 * Useful for modals, expanded stacks, focused items.
 */
export const useEscapeKey = ({
  isActive,
  onEscape,
  isLocked = false,
}: UseEscapeKeyOptions) => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isLocked || e.key !== "Escape") {
        return;
      }

      onEscape();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, onEscape, isLocked]);
};
