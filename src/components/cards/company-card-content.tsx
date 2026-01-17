import { memo } from "react";
import type { CompanyCardContent } from "@/types/canvas";

interface CompanyCardContentProps {
  data: CompanyCardContent;
}

const CompanyCardContentComponent = ({
  data,
}: CompanyCardContentProps) => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-4 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
        <img
          alt={data.title}
          className="h-auto w-full object-cover"
          height="200"
          src={data.image}
          width="200"
        />
      </div>

      <h3 className="mb-2 flex-shrink-0 font-bold text-white text-xl">
        {data.title}
      </h3>

      {data.description && (
        <p className="mb-4 flex-grow overflow-auto text-sm text-white/70">
          {data.description}
        </p>
      )}
    </div>
  );
};

export const CompanyCardContentView = memo(CompanyCardContentComponent);
