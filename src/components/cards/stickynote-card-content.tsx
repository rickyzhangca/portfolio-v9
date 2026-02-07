/**
 * @deprecated This component is no longer used. Card implementations have moved to src/cards/<kind>/
 * See src/cards/README.md for the current architecture.
 */

import { memo } from "react";
import type { StickyNoteCardContent } from "@/cards/types";

interface StickyNoteCardContentProps {
  data: StickyNoteCardContent;
}

const StickyNoteCardContentComponent = ({
  data,
}: StickyNoteCardContentProps) => {
  const colorMap: Record<StickyNoteCardContent["color"], string> = {
    pink: "bg-pink-200",
    blue: "bg-blue-200",
    green: "bg-green-200",
    orange: "bg-orange-200",
    yellow: "bg-yellow-200",
  };
  const colorClass = colorMap[data.color];

  return (
    <div className="h-full w-full">
      <div className={`h-full w-full rounded-lg shadow-md ${colorClass} p-6`}>
        <p className="wrap-break-word whitespace-pre-wrap font-hand">
          {data.content}
        </p>
      </div>
    </div>
  );
};

export const StickyNoteCardContentView = memo(StickyNoteCardContentComponent);
