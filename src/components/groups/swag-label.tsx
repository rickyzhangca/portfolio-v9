import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SwagItem } from "@/types/canvas";
import { SWAG_TRIGGER_CLASS, SwagImage } from "./swag-image";

/** Hover shows a swag item's label; a finger can't hover, so a tap toggles it. */
export const SwagLabel = ({ swag }: { swag: SwagItem }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touchTapRef = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnOutsideTap = (event: PointerEvent) => {
      if (
        event.pointerType !== "mouse" &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", closeOnOutsideTap, true);
    return () =>
      window.removeEventListener("pointerdown", closeOnOutsideTap, true);
  }, [open]);

  const handleOpenChange = useCallback(
    (next: boolean, details: { reason: string }) => {
      // The click that follows a tap would close what the tap just opened.
      if (!next && details.reason === "trigger-press" && touchTapRef.current) {
        return;
      }
      setOpen(next);
    },
    []
  );
  const handlePointerDown = useCallback(() => {
    touchTapRef.current = false;
  }, []);
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") {
        touchTapRef.current = true;
        setOpen((current) => !current);
      }
    },
    []
  );

  return (
    <Tooltip onOpenChange={handleOpenChange} open={open}>
      <TooltipTrigger
        className={SWAG_TRIGGER_CLASS}
        closeDelay={0}
        delay={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        ref={triggerRef}
      >
        <SwagImage swag={swag} />
      </TooltipTrigger>
      <TooltipContent className="items-center text-center">
        <p>{swag.label}</p>
        {swag.caption ? (
          <p className="text-foreground2">{swag.caption}</p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
};
