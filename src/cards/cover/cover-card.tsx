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

      <div className="absolute bottom-6 left-6 flex flex-col gap-1">
        <h3 className="font-medium text-white">{content.company}</h3>
        <p className="relative text-[13px] text-white">
          <span className="absolute opacity-50 mix-blend-overlay">
            {content.title}
          </span>
          <span className="mix-blend-overlay">{content.title}</span>
        </p>
      </div>
    </div>
  );
};

export const CoverCard = memo(CoverCardComponent);
