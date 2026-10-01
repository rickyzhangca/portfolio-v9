import { ABOUT_SHEET_SIZE } from "@/cards/about/about-data";
import type { AboutCardContent } from "@/cards/registry";
import { AboutSheet } from "@/components/about/about-sheet";
import { PaperPreviewFrame } from "@/components/documents/paper-preview-frame";

const PREVIEW_WIDTH = 240;

const PADDING_X = 64;

const PREVIEW_SCALE = (PREVIEW_WIDTH - PADDING_X / 2) / ABOUT_SHEET_SIZE.width;

interface AboutCardProps {
  content: AboutCardContent;
}

export const AboutCard = (_props: AboutCardProps) => {
  // About card is markdown-driven, no typed data needed
  return (
    <PaperPreviewFrame label="About">
      <div
        className="origin-top-left"
        style={{
          paddingLeft: PADDING_X,
          paddingRight: PADDING_X,
          transform: `scale(${PREVIEW_SCALE})`,
          width: ABOUT_SHEET_SIZE.width,
        }}
      >
        <AboutSheet interactive={false} />
      </div>
    </PaperPreviewFrame>
  );
};
