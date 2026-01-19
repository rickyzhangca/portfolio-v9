import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { memo } from "react";
import type { EmailCardContent } from "@/types/canvas";

interface EmailCardContentProps {
  data: EmailCardContent;
}

const EmailCardContentComponent = ({ data }: EmailCardContentProps) => {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden rounded-full bg-linear-to-b from-white to-background2 p-2">
      <button className="h-full px-5" type="button">
        {data.link.label}
      </button>
      <motion.a
        className="no-drag flex items-center justify-center rounded-full p-4 text-white transition hover:scale-105"
        href={data.link.url}
        rel="noopener noreferrer"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0) 90%, rgba(0, 0, 0, 0.1) 100%), linear-gradient(180deg, #FF7F4F 0%, #BC3806 100%)",
          boxShadow:
            "0px 0px 6px rgba(0, 0, 0, 0.16), -1px 1px 2px rgba(0, 0, 0, 0.24), -3px 4px 6px rgba(0, 0, 0, 0.16)",
        }}
        target="_blank"
        whileTap={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0) 90%, rgba(0, 0, 0, 0.1) 100%), linear-gradient(180deg, #CA3B05 0%, #E86534 100%)",
          boxShadow: "0px 0px 6px rgba(0, 0, 0, 0.24)",
        }}
      >
        <EnvelopeSimpleIcon size={24} />
      </motion.a>
    </div>
  );
};

export const EmailCardContentView = memo(EmailCardContentComponent);
