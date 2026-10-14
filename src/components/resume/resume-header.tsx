import type { ResumeHeader as ResumeHeaderData } from "@/cards/types";
import { ResumeSection } from "./resume-section";

interface ResumeHeaderProps {
  data?: ResumeHeaderData;
}

const LINK_CLASS =
  "w-fit underline decoration-foreground1/25 underline-offset-[0.2em] hover:decoration-foreground1";

export const ResumeHeader = ({ data }: ResumeHeaderProps) => (
  <ResumeSection
    label={data?.name}
    labelClassName="text-[21px]/[25px] sm:text-end"
  >
    <div className="flex flex-col">
      <a
        className={LINK_CLASS}
        href={data?.website}
        rel="noreferrer"
        target="_blank"
      >
        {data?.website.replace("https://", "")}
      </a>
      <a className={LINK_CLASS} href={`mailto:${data?.email}`}>
        {data?.email}
      </a>
      <p>{data?.phone}</p>
    </div>
  </ResumeSection>
);
