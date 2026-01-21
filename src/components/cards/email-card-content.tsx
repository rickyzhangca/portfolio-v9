import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { SPRING_PRESETS } from "@/lib/animation";
import type { EmailCardContent } from "@/types/canvas";

interface EmailCardContentProps {
  data: EmailCardContent;
}

const EmailCardContentComponent = ({ data }: EmailCardContentProps) => {
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const copyEmailToClipboard = () => {
    if (copied || isAnimating) {
      return;
    }

    // Extract email from mailto: link if present, otherwise use the URL directly
    const email = data.link.url.replace("mailto:", "");
    navigator.clipboard.writeText(email);
    track(AnalyticsEvents.EMAIL_COPY, { success: true });
    setCopied(true);
    setIsAnimating(true);

    setTimeout(() => {
      setCopied(false);
    }, 700);
  };

  const textVariants = {
    initial: {
      y: "100%",
      opacity: 0,
    },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: SPRING_PRESETS.snappy,
    },
    exit: {
      y: "-100%",
      opacity: 0,
      scale: 0.5,
      transition: SPRING_PRESETS.snappy,
    },
  };

  return (
    <div className="relative flex h-full items-center justify-center gap-1 overflow-hidden rounded-full bg-linear-to-b from-white to-background2 p-2">
      <motion.button
        aria-label={
          copied ? "Email copied to clipboard" : `Copy ${data.link.label}`
        }
        className="relative flex h-full items-center justify-center overflow-hidden rounded-full px-5 transition hover:bg-background2 active:bg-background3"
        disabled={isAnimating}
        onClick={copyEmailToClipboard}
        type="button"
      >
        <span aria-hidden="true" className="opacity-0">
          {data.link.label}
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence
            initial={false}
            mode="popLayout"
            onExitComplete={() => !copied && setIsAnimating(false)}
          >
            {copied ? (
              <motion.span
                animate="animate"
                className="block"
                exit="exit"
                initial="initial"
                key="copied"
                variants={textVariants}
              >
                Copied
              </motion.span>
            ) : (
              <motion.span
                animate="animate"
                className="block"
                exit="exit"
                initial="initial"
                key="default"
                variants={textVariants}
              >
                {data.link.label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
      <motion.a
        className="no-drag flex items-center justify-center rounded-full p-4 text-white transition hover:scale-110"
        href={data.link.url}
        onClick={() => track(AnalyticsEvents.EMAIL_OPEN, { method: "mailto" })}
        rel="noopener noreferrer"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0) 90%, rgba(0, 0, 0, 0.1) 100%), linear-gradient(180deg, #FF7F4F 0%, #BC3806 100%)",
          boxShadow:
            "0px 0px 6px rgba(0, 0, 0, 0.16), -1px 1px 2px rgba(0, 0, 0, 0.24), -3px 4px 6px rgba(0, 0, 0, 0.16)",
        }}
        target="_self"
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
