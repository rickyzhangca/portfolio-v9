import { AboutSheet } from "@/components/about/about-sheet";
import { ABOUT_SHEET_SIZE } from "@/cards/about/about-data";
import type { AboutCardContent } from "@/cards/registry";

const PREVIEW_WIDTH = 240;

const PADDING_X = 64;

const PREVIEW_SCALE = (PREVIEW_WIDTH - PADDING_X / 2) / ABOUT_SHEET_SIZE.width;

interface AboutCardProps {
  content: AboutCardContent;
}

export const AboutCard = (_props: AboutCardProps) => {
  // About card is markdown-driven, no typed data needed
  return (
    <div className="h-full w-full overflow-hidden rounded-3xl bg-white">
      <p className="mx-2 mt-2 mb-1 w-fit rounded-full bg-background2 px-5 py-2 font-medium text-foreground1/50 text-sm">
        About
      </p>
      <div
        className="origin-top-left"
        style={{
          transform: `scale(${PREVIEW_SCALE})`,
          paddingLeft: PADDING_X,
          paddingRight: PADDING_X,
        }}
      >
        <AboutSheet interactive={false} />
      </div>
    </div>
  );
};
