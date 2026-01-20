import { memo } from "react";
import type { StickyNoteCardContent } from "@/cards/registry";

interface StickyNoteCardProps {
  content: StickyNoteCardContent;
}

const StickyNoteCardComponent = ({ content }: StickyNoteCardProps) => {
  const colorClass =
    content.color === "pink"
      ? "bg-pink-200"
      : content.color === "blue"
        ? "bg-blue-200"
        : content.color === "green"
          ? "bg-green-200"
          : content.color === "orange"
            ? "bg-orange-200"
            : "bg-yellow-200";

  return (
    <div className="h-full w-full">
      <div className={`h-full w-full rounded-lg shadow-md ${colorClass} p-6`}>
        <p className="wrap-break-word whitespace-pre-wrap font-hand">
          {content.content}
        </p>
      </div>
    </div>
  );
};

export const StickyNoteCard = memo(StickyNoteCardComponent);
