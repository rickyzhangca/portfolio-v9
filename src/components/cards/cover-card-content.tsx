/**
 * @deprecated This component is no longer used. Card implementations have moved to src/cards/<kind>/
 * See src/cards/README.md for the current architecture.
 */

import { memo } from "react";
import type { CoverCardContent } from "@/cards/types";

interface CoverCardContentProps {
  data: CoverCardContent;
}

const CoverCardContentComponent = ({ data }: CoverCardContentProps) => {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <img
        alt={data.company}
        className="h-auto w-full object-cover"
        height="200"
        src={data.image}
        width="200"
      />

      <div className="absolute bottom-6 left-6 flex flex-col gap-1">
        <h3 className="font-medium text-white">{data.company}</h3>
        <p className="relative text-[13px] text-white">
          <span className="absolute opacity-50 mix-blend-overlay">
            {data.title}
          </span>
          <span className="mix-blend-overlay">{data.title}</span>
        </p>
      </div>
    </div>
  );
};

export const CoverCardContentView = memo(CoverCardContentComponent);
