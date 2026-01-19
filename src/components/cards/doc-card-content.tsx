import type { DocCardContent } from "@/types/canvas";
import { AboutCardContentView } from "./about-card-content";
import { ResumeCardContentView } from "./resume-card-content";

interface DocCardContentProps {
  data: DocCardContent;
}

export const DocCardContentView = ({ data }: DocCardContentProps) => {
  if (data.docType === "resume") {
    return <ResumeCardContentView data={data} />;
  }
  if (data.docType === "about") {
    return <AboutCardContentView data={data} />;
  }

  return null;
};
