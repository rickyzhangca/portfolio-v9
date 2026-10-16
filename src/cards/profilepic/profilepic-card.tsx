import { animate, motion, useMotionValue } from "framer-motion";
import { useAtomValue } from "jotai";
import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ProfilePicCardContent } from "@/cards/registry";
import { deskLampAtom } from "@/context/atoms";
import { tw } from "@/lib/utils";

// Loaded only when the desk lamp is switched on, outside the first view's JS.
const LitBadge = lazy(() =>
  import("@/components/lighting/lit-badge").then((module) => ({
    default: module.LitBadge,
  }))
);

interface ProfilePicCardProps {
  content: ProfilePicCardContent;
}

const FLIP = {
  damping: 10,
  mass: 0.5,
  stiffness: 150,
  type: "spring",
} as const;

const ProfilePicCardComponent = ({ content }: ProfilePicCardProps) => {
  const [index, setIndex] = useState(0);
  // Read by the lit badge each frame, so the photo and the angle change in
  // the same frame when a flip lands.
  const indexRef = useRef(0);
  const isFlippingRef = useRef<boolean>(false);
  const rotation = useMotionValue(0);
  const isLampOn = useAtomValue(deskLampAtom);
  const [isLitReady, setLitReady] = useState(false);
  // The DOM faces give way once WebGPU has drawn its first frame; they stay
  // for clicks and alt text.
  const isDomHidden = isLampOn && isLitReady;
  const handleLitReady = useCallback(() => setLitReady(true), []);

  useEffect(() => {
    if (!isLampOn) {
      setLitReady(false);
    }
  }, [isLampOn]);

  const handleTap = async () => {
    if (isFlippingRef.current) {
      return;
    }
    isFlippingRef.current = true;
    await animate(rotation, 180, FLIP);
    const next = (indexRef.current + 1) % content.images.length;
    indexRef.current = next;
    rotation.set(0);
    setIndex(next);
    isFlippingRef.current = false;
  };

  const currentImage = content.images[index];
  const nextImage = content.images[(index + 1) % content.images.length];

  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-lg">
      <motion.div
        className="relative h-full w-full cursor-pointer"
        onClick={handleTap}
        style={{ perspective: "1000px" }}
        whileHover={{ scale: 1.1 }}
      >
        <motion.div
          className={tw("relative h-full w-full", isDomHidden && "opacity-0")}
          style={{ rotateY: rotation, transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/** biome-ignore lint/correctness/useImageSize: follows container size */}
            <img
              alt={content.alt || "Profile pic"}
              className="h-full w-full rounded-full border-6 border-white object-cover"
              src={currentImage}
            />
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/** biome-ignore lint/correctness/useImageSize: follows container size */}
            <img
              alt={content.alt || "Profile pic"}
              className="h-full w-full rounded-full border-6 border-white object-cover"
              src={nextImage}
            />
          </div>
        </motion.div>
        {isLampOn ? (
          <Suspense fallback={null}>
            <LitBadge
              indexRef={indexRef}
              onReady={handleLitReady}
              photos={content.images}
              rotation={rotation}
            />
          </Suspense>
        ) : null}
      </motion.div>
    </div>
  );
};

export const ProfilePicCard = memo(ProfilePicCardComponent);
