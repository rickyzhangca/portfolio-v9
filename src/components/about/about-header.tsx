import type { AboutData } from "@/types/canvas";

interface AboutHeaderProps {
  data?: AboutData;
}

export const AboutHeader = ({ data }: AboutHeaderProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-medium text-5xl">{data?.title}</h1>
    </div>
  );
};
