import type { Experience } from "@/cards/types";
import { ResumeEntry } from "./resume-entry";
import { ResumeSection } from "./resume-section";

interface ResumeExperienceProps {
  data?: Experience[];
}

export const ResumeExperience = ({ data }: ResumeExperienceProps) => {
  const experiences = data || [];

  return (
    <ResumeSection label="Experience">
      <div className="flex flex-col gap-8">
        {experiences.map((experience) => (
          <ResumeEntry
            dates={experience.caption}
            key={`${experience.company}-${experience.title}`}
            logo={experience.logo}
            logoAlt={experience.company}
            subtitle={experience.company}
            title={experience.title}
          >
            {experience.description.length > 1 ? (
              <ul className="list-disc space-y-1.5 pl-5 marker:text-foreground1/40">
                {experience.description.map((description) => (
                  <li key={description}>{description}</li>
                ))}
              </ul>
            ) : (
              <p className="text-pretty">{experience.description}</p>
            )}
          </ResumeEntry>
        ))}
      </div>
    </ResumeSection>
  );
};
