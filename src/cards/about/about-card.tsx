import { ABOUT_CARD_SIZE } from "@/cards/about/about-data";
import type { AboutCardContent } from "@/cards/registry";
import { AboutSheet } from "@/components/about/about-sheet";
import { ScaledPaperPreview } from "@/components/documents/scaled-paper-preview";

interface AboutCardProps {
  content: AboutCardContent;
}

export const AboutCard = (_props: AboutCardProps) => (
  <ScaledPaperPreview
    height={ABOUT_CARD_SIZE.height}
    width={ABOUT_CARD_SIZE.width}
  >
    <AboutSheet interactive={false} />
  </ScaledPaperPreview>
);
