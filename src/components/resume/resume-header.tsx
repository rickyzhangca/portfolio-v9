import type { ResumeHeader as ResumeHeaderData } from "@/types/canvas";

interface ResumeHeaderProps {
  data?: ResumeHeaderData;
}

export const ResumeHeader = ({ data }: ResumeHeaderProps) => {
  return (
    <div className="flex gap-10">
      <p className="w-32 text-end font-medium text-xl">{data?.name}</p>
      <div className="flex flex-col gap-1">
        <a href={data?.website}>{data?.website.replace("https://", "")}</a>
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
};
