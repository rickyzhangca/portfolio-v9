import { memo } from "react";
import type { MacbookCardContent } from "@/cards/registry";
import macbookImage from "/src/assets/macbook/macbook.webp";

interface MacbookCardProps {
  content: MacbookCardContent;
}

const MacbookCardComponent = ({ content }: MacbookCardProps) => {
  return (
    <div className="relative h-full w-full">
      {/* MacBook base image */}
      {/* biome-ignore lint/correctness/useImageSize: dimensions set by CSS classes */}
      <img
        alt="MacBook"
        className="h-full w-full object-contain"
        src={macbookImage}
      />

      {/* Stickers layer */}
      {content.stickers.map((sticker) => (
        <img
          alt={sticker.description}
          className="absolute"
          height={sticker.height}
          key={sticker.src}
          src={sticker.src}
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            width: `${sticker.width}px`,
            height: `${sticker.height}px`,
            transform: "translate(-50%, -50%)",
          }}
          width={sticker.width}
        />
      ))}
    </div>
  );
};

export const MacbookCard = memo(MacbookCardComponent);
