import { memo } from "react";
import type { CoverCardContent } from "@/cards/registry";
import { getCoverLogoRect } from "./cover-layout";

interface CoverCardProps {
  content: CoverCardContent;
}

// A faint printed grid that fades out down the board.
const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px)",
  backgroundSize: "13px 13px",
  maskImage: "linear-gradient(180deg, black 0%, black 35%, transparent 85%)",
  WebkitMaskImage:
    "linear-gradient(180deg, black 0%, black 35%, transparent 85%)",
};

/**
 * A company folder's front: board, logo and live text as separate layers, so
 * the desk lamp lights the board and the logo's relief (FolderLighting), and
 * the text stays sharp, selectable and in step with the data.
 */
const CoverCardComponent = ({ content }: CoverCardProps) => {
  const logo = getCoverLogoRect(content.board.logoFit);
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: content.board.background }}
    >
      {content.board.pattern === "grid" ? (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={GRID_STYLE}
        />
      ) : null}
      <img
        alt={content.company}
        className="absolute"
        decoding="async"
        height={logo.height}
        src={content.logo}
        style={{ left: logo.x, top: logo.y }}
        width={logo.width}
      />
      <div className="absolute right-4 bottom-6 left-6">
        <p className="font-semibold text-[17px] text-white leading-tight">
          {content.company}
        </p>
        {content.title ? (
          <p
            className="mt-1.5 text-[13px] leading-snug"
            style={{ color: content.board.accent }}
          >
            {content.title}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export const CoverCard = memo(CoverCardComponent);
