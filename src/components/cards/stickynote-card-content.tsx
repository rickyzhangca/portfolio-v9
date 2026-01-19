import { memo } from "react";
import type { StickyNoteCardContent } from "@/types/canvas";

interface StickyNoteCardContentProps {
  data: StickyNoteCardContent;
}

const StickyNoteCardContentComponent = ({
  data,
}: StickyNoteCardContentProps) => {
  const colorClass =
    data.color === "pink"
      ? "bg-pink-200"
      : data.color === "blue"
        ? "bg-blue-200"
        : data.color === "green"
          ? "bg-green-200"
          : data.color === "orange"
            ? "bg-orange-200"
            : "bg-yellow-200";

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
