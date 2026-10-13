import type { ResumeEducation as ResumeEducationData } from "@/cards/types";

interface ResumeEducationProps {
  data?: ResumeEducationData;
}

export const ResumeEducation = ({ data }: ResumeEducationProps) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
    <p className="font-medium text-lg sm:w-32 sm:min-w-32 sm:text-end">
      Education
    </p>
    <div className="flex items-start gap-3">
      <img
        alt={`${data?.institution} logo`}
        height={28}
        src={data?.logo}
        width={28}
      />
      <div className="flex flex-col gap-1.5">
        <p className="flex flex-wrap items-baseline gap-x-3 font-medium text-lg">
          <span>{data?.degree}</span>
          <span className="text-foreground2">
            {data?.institution}, {data?.years}
          </span>
        </p>
        <p>{data?.description}</p>
      </div>
    </div>
  </div>
);
