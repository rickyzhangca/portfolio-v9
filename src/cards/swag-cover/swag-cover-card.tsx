import { memo } from "react";
import type { SwagCoverCardContent } from "@/cards/registry";
import { tw } from "@/lib/utils";

interface SwagCoverCardProps {
  content: SwagCoverCardContent;
}

const SwagCoverCardComponent = ({ content }: SwagCoverCardProps) => {
  const colorMap: Record<SwagCoverCardContent["color"], string> = {
    pink: "bg-pink-200",
    blue: "bg-blue-200",
    green: "bg-green-200",
    orange: "bg-orange-200",
    yellow: "bg-yellow-200",
  };
  const colorClass = colorMap[content.color];

  return (
    <div className={tw("h-full w-full rounded-sm p-4 shadow-md", colorClass)}>
      <p className="wrap-break-word whitespace-pre-wrap font-hand text-sm">
        {content.content}
      </p>
    </div>
  );
};

export const SwagCoverCard = memo(SwagCoverCardComponent);
