import { memo } from "react";
import type { SwagCoverCardContent } from "@/cards/registry";
import { PaperLighting } from "@/components/lighting/lit-paper";
import { tw } from "@/lib/utils";

interface SwagCoverCardProps {
  content: SwagCoverCardContent;
}

const SwagCoverCardComponent = ({ content }: SwagCoverCardProps) => {
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
      className={tw(
        "relative isolate h-full w-full rounded-sm p-4 shadow-md",
        colorClass
      )}
    >
      <p className="wrap-break-word whitespace-pre-wrap font-hand text-sm">
        {content.content}
      </p>
      <PaperLighting kind="sticky" radius={4} />
    </div>
  );
};

export const SwagCoverCard = memo(SwagCoverCardComponent);
