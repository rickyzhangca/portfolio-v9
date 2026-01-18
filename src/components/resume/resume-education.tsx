import queensLogo from "/src/assets/resume/queens.webp";

export const ResumeEducation = () => {
  return (
    <div className="flex gap-10">
      <p className="w-32 text-end font-medium text-lg">Education</p>
      <div className="flex items-start gap-3">
        <img
          alt="Queen's University logo"
          className="rounded-md outline outline-foreground1/20"
          height={28}
          src={queensLogo}
          width={28}
        />
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-3 font-medium text-lg">
            <span>BCH in Cognitive Science</span>
            <span className="text-foreground2">
              Queen's University, 2017-2021
            </span>
          </p>
          <p>
            Learned computer science, artificial intelligence, psychology,
            linguistics
          </p>
        </div>
      </div>
    </div>
  );
};
