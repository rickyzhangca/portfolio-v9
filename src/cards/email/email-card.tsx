import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useAtomValue } from "jotai";
import { lazy, memo, Suspense, useCallback, useEffect, useState } from "react";
import { SPRING_PRESETS } from "@/lib/animation";
import type { EmailCardContent } from "@/cards/registry";
import { deskLampAtom } from "@/context/atoms";
import { tw } from "@/lib/utils";

// Loaded only when the desk lamp is switched on, outside the first view's JS.
const LitEmail = lazy(() =>
  import("@/components/lighting/lit-email").then((module) => ({
    default: module.LitEmail,
  }))
);

const BUTTON_BACKGROUND =
  "radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0) 90%, rgba(0, 0, 0, 0.1) 100%), linear-gradient(180deg, #FF7F4F 0%, #BC3806 100%)";
const BUTTON_SHADOW =
  "0px 0px 6px rgba(0, 0, 0, 0.16), -1px 1px 2px rgba(0, 0, 0, 0.24), -3px 4px 6px rgba(0, 0, 0, 0.16)";
/** Rows the lit screen scans the new text in, top to bottom. */
const SCAN_ROWS = 7;
// Holds each scanned row for a moment, as a tube draws a frame at a time.
const scanEase = (progress: number) =>
  Math.min(Math.ceil(progress * SCAN_ROWS) / SCAN_ROWS, 1);

/**
 * On the lit screen the text changes as an old display redraws: the old line
 * blanks at once, and after a dark frame the new one is scanned in from the
 * top, row by row, flaring as the phosphor is struck before it settles.
 */
const SCREEN_TEXT_VARIANTS: Variants = {
  animate: {
    clipPath: "inset(0% 0% 0% 0%)",
    filter: "brightness(1)",
    opacity: 1,
    transition: {
      clipPath: { delay: 0.06, duration: 0.16, ease: scanEase },
      filter: { delay: 0.06, duration: 0.4, ease: "easeOut" },
      opacity: { duration: 0 },
    },
  },
  exit: { opacity: 0, transition: { duration: 0 } },
  initial: {
    clipPath: "inset(0% 0% 100% 0%)",
    filter: "brightness(2.2)",
    opacity: 1,
  },
};

const BUTTON_PRESSED = {
  background:
    "radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0) 90%, rgba(0, 0, 0, 0.1) 100%), linear-gradient(180deg, #CA3B05 0%, #E86534 100%)",
  boxShadow: "0px 0px 6px rgba(0, 0, 0, 0.24)",
};

interface EmailCardProps {
  content: EmailCardContent;
}

const EmailCardComponent = ({ content }: EmailCardProps) => {
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const isLampOn = useAtomValue(deskLampAtom);
  const [isLitReady, setLitReady] = useState(false);
  // The pill and the button's face give way to WebGPU once it has drawn its
  // first frame; the address and the icon stay on top.
  const isDomHidden = isLampOn && isLitReady;
  const handleLitReady = useCallback(() => setLitReady(true), []);

  useEffect(() => {
    if (!isLampOn) {
      setLitReady(false);
    }
  }, [isLampOn]);

  const copyEmailToClipboard = () => {
    if (copied || isAnimating) {
      return;
    }

    // Extract email from mailto: link if present, otherwise use the URL directly
    const email = content.link.url.replace("mailto:", "");
    navigator.clipboard.writeText(email);
    setCopied(true);
    setIsAnimating(true);

    setTimeout(() => {
      setCopied(false);
    }, 700);
  };

  const finishAnimating = useCallback(() => {
    if (!copied) {
      setIsAnimating(false);
    }
  }, [copied]);

  const slideVariants = {
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

  const textVariants = isDomHidden ? SCREEN_TEXT_VARIANTS : slideVariants;

  return (
    <div className="relative h-full">
      {isLampOn ? (
        <Suspense fallback={null}>
          <LitEmail onReady={handleLitReady} />
        </Suspense>
      ) : null}
      <div
        className={tw(
          "relative flex h-full items-center justify-center gap-1 overflow-hidden rounded-full p-2",
          !isDomHidden && "bg-linear-to-b from-white to-background2"
        )}
      >
        <motion.button
          aria-label={
            copied ? "Email copied to clipboard" : `Copy ${content.link.label}`
          }
          className={tw(
            "relative flex h-full cursor-pointer items-center justify-center overflow-hidden rounded-full px-5 transition",
            isDomHidden
              ? // Under the lamp the address glows on the screen, centred on
                // it, and brightens under the pointer.
                "text-[#FFB86B] [text-shadow:0_0_4px_rgba(255,160,60,0.7),0_0_12px_rgba(255,140,40,0.3)] hover:text-[#FFE0B0] active:opacity-80 hover:[text-shadow:0_0_3px_rgba(255,220,160,1),0_0_10px_rgba(255,170,70,0.95),0_0_24px_rgba(255,140,40,0.7)]"
              : "hover:bg-background2 active:bg-background3"
          )}
          disabled={isAnimating}
          onClick={copyEmailToClipboard}
          type="button"
        >
          <span aria-hidden="true" className="opacity-0">
            {content.link.label}
          </span>
          {/* The screen's face, Matrix Sans Raster (loaded by the lit card),
              sets only the visible text: the hidden label above keeps sizing
              the card in its own font. 15px puts its dot grid on whole
              device pixels. */}
          <div
            className={tw(
              "absolute inset-0 flex items-center justify-center",
              isDomHidden && "font-['Matrix_Sans_Raster',monospace] text-[15px]"
            )}
          >
            <AnimatePresence
              initial={false}
              mode="popLayout"
              onExitComplete={finishAnimating}
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
                  {content.link.label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.button>
        {/* Where the lit card's screen lies, between the address and the
            button; the shader draws its glass there. Empty in itself. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-2 right-[68px] left-2 rounded-full"
          data-email-screen
        />
        <motion.a
          className={tw(
            "no-drag flex items-center justify-center rounded-full p-4 transition",
            isDomHidden
              ? // Under the lamp the lit button presses in like a key, and the
                // icon is etched into its metal: a pale, translucent mark the
                // face's own light shows through, not a flat white glyph.
                "text-[#FFE6D8]/70"
              : "text-white hover:scale-110"
          )}
          data-email-button
          href={content.link.url}
          rel="noopener noreferrer"
          style={
            isDomHidden
              ? { background: "transparent", boxShadow: "none" }
              : { background: BUTTON_BACKGROUND, boxShadow: BUTTON_SHADOW }
          }
          target="_self"
          whileTap={isDomHidden ? undefined : BUTTON_PRESSED}
        >
          <EnvelopeSimpleIcon size={24} />
        </motion.a>
      </div>
    </div>
  );
};

export const EmailCard = memo(EmailCardComponent);
