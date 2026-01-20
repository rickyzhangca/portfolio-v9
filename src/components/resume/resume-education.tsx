import type { ResumeEducation as ResumeEducationData } from "@/cards/types";

interface ResumeEducationProps {
  data?: ResumeEducationData;
}

export const ResumeEducation = ({ data }: ResumeEducationProps) => {
  return (
    <div className="flex gap-10">
      <p className="w-32 text-end font-medium text-lg">Education</p>
      <div className="flex items-start gap-3">
        <img
          alt={`${data?.institution} logo`}
          className="rounded-md outline outline-foreground1/20"
          height={28}
          src={data?.logo}
          width={28}
        />
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-3 font-medium text-lg">
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
};
