import type { DocCardContent } from "@/types/canvas";
import { ResumeCardContentView } from "./resume-card-content";

interface DocCardContentProps {
  data: DocCardContent;
}

export const DocCardContentView = ({ data }: DocCardContentProps) => {
  if (data.docType === "resume") {
    return <ResumeCardContentView data={data} />;
  }

  return null;
};
