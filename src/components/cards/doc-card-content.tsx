import { ResumeCardContentView } from "./resume-card-content";
import { ContactCardContentView } from "./contact-card-content";
import type { ContactCardContent, DocCardContent } from "@/types/canvas";

interface DocCardContentProps {
  data: DocCardContent;
}

export const DocCardContentView = ({ data }: DocCardContentProps) => {
  if (data.docType === "resume") {
    return <ResumeCardContentView data={data} />;
  }

  if (data.docType === "contact") {
    // Transform DocCardContent to ContactCardContent for the view
    const contactData: ContactCardContent = {
      title: data.title ?? "",
      description: data.description,
      link: data.link ?? {
        label: "Contact",
        url: "#",
      },
    };
    return <ContactCardContentView data={contactData} />;
  }

  return null;
};
