import { memo } from "react";
import type { SwagCoverCardContent } from "@/cards/registry";
import { tw } from "@/lib/utils";

interface SwagCoverCardProps {
  content: SwagCoverCardContent;
}

const SwagCoverCardComponent = ({ content }: SwagCoverCardProps) => {
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
    <div className={tw("h-full w-full rounded-sm p-4 shadow-md", colorClass)}>
      <p className="wrap-break-word whitespace-pre-wrap font-hand text-sm">
        {content.content}
      </p>
    </div>
  );
};

export const SwagCoverCard = memo(SwagCoverCardComponent);
