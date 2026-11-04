import type { SkillCategory } from "@/cards/types";
import { ResumeSection } from "./resume-section";

interface ResumeSkillsProps {
  data?: SkillCategory[];
}

export const ResumeSkills = ({ data }: ResumeSkillsProps) => {
  const skillCategories = data || [];

  return (
    <ResumeSection label="Skills">
      {/* One row from 640px: auto columns share the width and wrap long skills instead of the categories. */}
      <div className="flex flex-col gap-6 sm:grid sm:grid-flow-col sm:gap-x-10">
        {skillCategories.map((category) => (
          <div className="flex flex-col gap-1.5" key={category.category}>
            <h3 className="font-semibold text-foreground1/65 text-sm/[20px]">
              {category.category}
            </h3>
            <ul className="flex flex-col">
              {category.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ResumeSection>
  );
};
