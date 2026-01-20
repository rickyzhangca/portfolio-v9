import type { Experience } from "@/cards/types";

interface ResumeExperienceProps {
  data?: Experience[];
}

export const ResumeExperience = ({ data }: ResumeExperienceProps) => {
  const experiences = data || [];

  return (
    <div className="flex gap-10">
      <p className="w-32 min-w-32 text-end font-medium text-lg">Experience</p>
      <div className="flex flex-col gap-7">
        {experiences.map((experience) => (
          <div
            className="flex items-start gap-3"
            key={`${experience.company}-${experience.title}`}
          >
            <img
              alt={experience.company}
              className="rounded-md outline outline-foreground1/20"
              height={28}
              src={experience.logo}
              width={28}
            />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 font-medium text-lg">
                <p>{experience.title}</p>
                <p className="text-foreground2">{experience.company}</p>
              </div>
              <ul className="list-disc pl-5">
                {experience.description.map((description) => (
                  <li className="mb-0.5" key={description}>
                    {description}
                  </li>
                ))}
              </ul>
              <p className="text-foreground2">{experience.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
