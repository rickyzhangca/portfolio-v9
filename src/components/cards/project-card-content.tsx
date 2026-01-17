import {
  ArrowSquareOut,
  GithubLogo,
  LinkedinLogo,
} from "@phosphor-icons/react";
import { memo } from "react";
import type { ProjectCardContent } from "@/types/canvas";

interface ProjectCardContentProps {
  data: ProjectCardContent;
}

const ProjectCardContentComponent = ({ data }: ProjectCardContentProps) => {
  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case "github":
        return <GithubLogo size={18} weight="fill" />;
      case "linkedin":
        return <LinkedinLogo size={18} weight="fill" />;
      default:
        return <ArrowSquareOut size={18} weight="fill" />;
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="overflow-hidden rounded-4xl border-4 border-white shadow-3xl">
        <img
          alt={data.title}
          className="h-auto w-full object-cover"
          height="200"
          src={data.image}
          width="200"
        />
      </div>
      <div className="flex w-fit items-center gap-3 rounded-full bg-white px-5 py-3 font-medium shadow-3xl">
        {data.title}
        {/* <div className="flex">
          <a
            className="no-drag flex items-center gap-1"
            href={data.link.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {renderIcon(data.link.icon)}
            <span>{data.link.label}</span>
          </a>
        </div> */}
      </div>
      {/* {data.description && (
        <p className="mb-4 flex-grow overflow-auto text-sm">
          {data.description}
        </p>
      )} */}

      {data.richContent && (
        <div className="flex-grow overflow-auto">{data.richContent}</div>
      )}
    </div>
  );
};

export const ProjectCardContentView = memo(ProjectCardContentComponent);
