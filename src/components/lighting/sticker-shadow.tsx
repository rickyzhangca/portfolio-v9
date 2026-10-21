import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { deskLampAtom } from "@/context/atoms";
import { startLazily } from "./start-lazily";

/**
 * Casts the lamp shadow of its parent, a sticker whose image has an alpha
 * outline, from a blurred bitmap under the image (lit-sprite.ts). The parent
 * must be a lamp shadow caster that forms a stacking context (a transform),
 * so the canvas sits under its content but inside its transforms.
 */
const LitStickerShadow = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const caster = canvas?.parentElement;
    if (!(canvas && caster)) {
      return;
    }
    return startLazily(
      () => import("./lit-sprite"),
      ({ runLampSprite }) => runLampSprite({ canvas, caster }),
      "Lamp sprite"
    );
  }, []);

  return (
    <canvas
      className="pointer-events-none absolute top-0 left-0 -z-10 opacity-0 will-change-[transform,opacity]"
      ref={canvasRef}
    />
  );
};

/** A sticker's lamp shadow, drawn only while the desk lamp is on. */
export const StickerShadow = () => {
  const isLampOn = useAtomValue(deskLampAtom);
  return isLampOn ? <LitStickerShadow /> : null;
};
