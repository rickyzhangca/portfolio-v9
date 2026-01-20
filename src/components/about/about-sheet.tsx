import { ABOUT_SHEET_SIZE } from "@/cards/about/about-data";
import aboutContent from "@/content/about.md?raw";
import { tw } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";

interface AboutSheetProps {
  className?: string;
  interactive?: boolean;
}

export const AboutSheet = ({
  className,
  interactive = true,
}: AboutSheetProps) => {
  return (
    <article
      className={tw(
        "flex h-full w-full flex-col bg-white px-10 pt-10",
        !interactive && "pointer-events-none select-none",
        className
      )}
      style={{
        width: ABOUT_SHEET_SIZE.width,
      }}
    >
      <MarkdownRenderer content={aboutContent} />
    </article>
  );
};
