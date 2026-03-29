import { memo } from "react";
import type { SwagCoverCardContent } from "@/cards/registry";
import type { CardShadowContext } from "@/lib/card-shadow";
import { getCardShadowStyle } from "@/lib/card-shadow";
import { tw } from "@/lib/utils";

interface SwagCoverCardProps {
  content: SwagCoverCardContent;
  shadowContext?: CardShadowContext;
}

const SwagCoverCardComponent = ({
  content,
  shadowContext,
}: SwagCoverCardProps) => {
  const colorMap: Record<NonNullable<SwagCoverCardContent["color"]>, string> = {
    pink: "bg-pink-200",
    blue: "bg-blue-200",
    green: "bg-green-200",
    orange: "bg-orange-200",
    yellow: "bg-yellow-200",
  };
  const colorClass = colorMap[content.color ?? "yellow"];

  return (
    <div
      className={tw("h-full w-full rounded-sm p-4", colorClass)}
      style={getCardShadowStyle({
        surface: "card-box-shadow",
        preset: "paper",
        zIndex: shadowContext?.zIndex,
        maxZIndex: shadowContext?.maxZIndex,
      })}
    >
      <p className="wrap-break-word whitespace-pre-wrap font-hand text-sm">
        {content.content}
      </p>
    </div>
  );
};

export const SwagCoverCard = memo(SwagCoverCardComponent);
