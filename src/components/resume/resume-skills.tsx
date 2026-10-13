import type { SkillCategory } from "@/cards/types";

interface ResumeSkillsProps {
  data?: SkillCategory[];
}

export const ResumeSkills = ({ data }: ResumeSkillsProps) => {
  const skillCategories = data || [];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
      <p className="font-medium text-lg sm:w-32 sm:min-w-32 sm:text-end">
        Skills
      </p>
      <div className="flex flex-wrap gap-x-12 gap-y-6">
        {skillCategories.map((category) => (
          <div className="flex flex-col gap-1.5" key={category.category}>
            <p className="font-medium text-foreground2 text-lg">
              {category.category}
            </p>
            <div className="flex flex-col gap-0.5">
              {category.skills.map((skill) => (
                <p key={skill}>{skill}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
