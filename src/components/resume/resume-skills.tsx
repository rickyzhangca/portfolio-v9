import type { SkillCategory } from "@/types/canvas";

interface ResumeSkillsProps {
  data?: SkillCategory[];
}

export const ResumeSkills = ({ data }: ResumeSkillsProps) => {
  const skillCategories = data || [];

  return (
    <div className="flex gap-10">
      <p className="w-32 text-end font-medium text-lg">Skills</p>
      <div className="flex gap-12">
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
