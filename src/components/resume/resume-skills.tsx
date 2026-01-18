export const ResumeSkills = () => {
  return (
    <div className="flex gap-10">
      <p className="w-32 text-end font-medium text-lg">Skills</p>
      <div className="flex gap-12">
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-foreground2 text-lg">Design</p>
          <div className="flex flex-col gap-0.5">
            <p>Design systems</p>
            <p>High fidelity</p>
            <p>Vector tools</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-foreground2 text-lg">Front-end</p>
          <div className="flex flex-col gap-0.5">
            <p>React, React Native, TypeScript</p>
            <p>Components composition</p>
            <p>Prototyping</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-foreground2 text-lg">Domains</p>
          <div className="flex flex-col gap-0.5">
            <p>Fintech</p>
            <p>Dev tools</p>
            <p>IT and operations</p>
          </div>
        </div>
      </div>
    </div>
  );
};
