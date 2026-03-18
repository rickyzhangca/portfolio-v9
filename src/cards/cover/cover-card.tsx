import { memo } from "react";
import type { CoverCardContent } from "@/cards/registry";

interface CoverCardProps {
  content: CoverCardContent;
}

const CoverCardComponent = ({ content }: CoverCardProps) => {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <img
        alt={content.company}
        className="h-auto w-full object-cover"
        height="200"
        src={content.image}
        width="200"
      />
    </div>
  );
};

export const CoverCard = memo(CoverCardComponent);
