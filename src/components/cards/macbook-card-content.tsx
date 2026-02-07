/**
 * @deprecated This component is no longer used. Card implementations have moved to src/cards/<kind>/
 * See src/cards/README.md for the current architecture.
 */

import { memo } from "react";
import type { MacbookCardContent } from "@/cards/types";
import macbookImage from "@/assets/macbook/macbook.webp";

interface MacbookCardContentProps {
  data: MacbookCardContent;
}

const MacbookCardContentComponent = ({ data }: MacbookCardContentProps) => {
  return (
    <div className="relative h-full w-full">
      {/* MacBook base image */}
      {/* biome-ignore lint/correctness/useImageSize: dimensions set by CSS classes */}
      <img
        src={macbookImage}
        alt="MacBook"
        className="h-full w-full object-contain"
      />

      {/* Stickers layer */}
      {data.stickers.map((sticker) => (
        <img
          key={sticker.src}
          src={sticker.src}
          alt={sticker.description}
          width={sticker.width}
          height={sticker.height}
          className="absolute"
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            width: `${sticker.width}px`,
            height: `${sticker.height}px`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
};

export const MacbookCardContentView = memo(MacbookCardContentComponent);
