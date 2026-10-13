import { memo } from "react";
import type { CoverCardContent } from "@/cards/registry";
import { getResponsiveImageSources } from "@/cards/responsive-image";

interface CoverCardProps {
  content: CoverCardContent;
}

const CoverCardComponent = ({ content }: CoverCardProps) => {
  const { src, srcSet } = getResponsiveImageSources(content.image);
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <img
        alt={content.company}
        className="h-auto w-full object-cover"
        height="200"
        src={src}
        srcSet={srcSet}
        width="200"
      />
    </div>
  );
};

export const CoverCard = memo(CoverCardComponent);
