import { motion, useAnimation } from "framer-motion";
import { memo, useState } from "react";
import type { ProfilePicCardContent } from "@/types/canvas";

interface ProfilePicCardContentProps {
  data: ProfilePicCardContent;
}

const ProfilePicCardContentComponent = ({
  data,
}: ProfilePicCardContentProps) => {
  const [index, setIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const controls = useAnimation();

  const handleTap = async () => {
    if (isFlipping) {
      return;
    }
    setIsFlipping(true);

    await controls.start({
      rotateY: 180,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 10,
        mass: 0.5,
      },
    });

    setIndex((prev) => (prev + 1) % data.images.length);
    controls.set({ rotateY: 0 });
    setIsFlipping(false);
  };

  const currentImage = data.images[index];
  const nextImage = data.images[(index + 1) % data.images.length];

  return (
    <div
      className="relative flex h-full w-full items-center justify-center rounded-lg"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        animate={controls}
        className="relative h-full w-full cursor-pointer"
        onClick={handleTap}
        style={{ transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.1 }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/** biome-ignore lint/correctness/useImageSize: follows container size */}
          <img
            alt={data.alt || "Profile pic"}
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
            alt={data.alt || "Profile pic"}
            className="h-full w-full rounded-full border-6 border-white object-cover"
            src={nextImage}
          />
        </div>
      </motion.div>
    </div>
  );
};

export const ProfilePicCardContentView = memo(ProfilePicCardContentComponent);
