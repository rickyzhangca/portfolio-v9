import { tw } from "@/lib/utils";
import { AboutHeader } from "./about-header";

export const ABOUT_SHEET_SIZE = {
  width: 840,
  height: 1000,
} as const;

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
        "flex h-full w-full flex-col gap-10 bg-white pt-10",
        !interactive && "pointer-events-none select-none",
        className
      )}
      style={{
        width: ABOUT_SHEET_SIZE.width,
        height: ABOUT_SHEET_SIZE.height,
      }}
    >
      <AboutHeader />
    </article>
  );
};
