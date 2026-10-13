import type { ResumeHeader as ResumeHeaderData } from "@/cards/types";

interface ResumeHeaderProps {
  data?: ResumeHeaderData;
}

export const ResumeHeader = ({ data }: ResumeHeaderProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:gap-10">
    <p className="font-medium text-xl sm:w-32 sm:min-w-32 sm:text-end">
      {data?.name}
    </p>
    <div className="flex flex-col gap-1">
      <a
        className="underline decoration-foreground1/30 underline-offset-3"
        href={data?.website}
        rel="noreferrer"
        target="_blank"
      >
        {data?.website.replace("https://", "")}
      </a>
      <a
        className="underline decoration-foreground1/30 underline-offset-3"
        href={`mailto:${data?.email}`}
      >
        {data?.email}
      </a>
      <p>{data?.phone}</p>
    </div>
  </div>
);
