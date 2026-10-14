import type { ReactNode } from "react";
import { tw } from "@/lib/utils";

/** The floating pill under a reader: back control first, then actions. */
export const READER_TOOLBAR_CLASS =
  "fixed bottom-6 left-1/2 flex w-max items-center overflow-hidden whitespace-nowrap rounded-full bg-foreground1/80 text-white backdrop-blur";
export const READER_TOOLBAR_SHADOW = "0 12px 24px -12px rgba(0,0,0,0.48)";
export const READER_TOOLBAR_BUTTON_CLASS =
  "flex cursor-pointer items-center gap-2 py-4 pr-4 pl-5 transition only:pr-5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-4px]";

/** A static toolbar for pages that are not opened from the canvas. */
export function ReaderToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className={tw(READER_TOOLBAR_CLASS, "z-10 -translate-x-1/2")}
      style={{ boxShadow: READER_TOOLBAR_SHADOW }}
    >
      {children}
    </div>
  );
}
