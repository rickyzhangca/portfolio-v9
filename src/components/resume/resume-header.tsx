export const ResumeHeader = () => {
  return (
    <div className="flex gap-10">
      <p className="w-32 text-end font-medium text-xl">Ricky Zhang</p>
      <div className="flex flex-col gap-1">
        <a href="https://rickyzhang.me">rickyzhang.me</a>
        <a
          className="underline decoration-foreground1/30 underline-offset-3"
          href="mailto:ricky.zhang@queensu.ca"
        >
          ricky.zhang@queensu.ca
        </a>
        <p>+1 647-514-6238</p>
      </div>
    </div>
  );
};
