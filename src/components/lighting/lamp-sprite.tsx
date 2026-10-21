import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { deskLampAtom } from "@/context/atoms";
import type { SpriteOutline } from "./lit-sprite";
import { startLazily } from "./start-lazily";

interface LampSpriteProps {
  /** What casts the shadow; see `SpriteOutline`. */
  outline: SpriteOutline;
}

/**
 * Casts the lamp shadow of its parent from a blurred bitmap of its outline
 * under its content (lit-sprite.ts). The parent must be a lamp shadow caster
 * that forms a stacking context (a transform, or the lamp's will-change), so
 * the canvas sits under its content but inside its transforms.
 */
const LitSprite = ({ outline }: LampSpriteProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const outlineRef = useRef(outline);

  useEffect(() => {
    const canvas = canvasRef.current;
    const caster = canvas?.parentElement;
    if (!(canvas && caster)) {
      return;
    }
    return startLazily(
      () => import("./lit-sprite"),
      ({ runLampSprite }) =>
        runLampSprite({ canvas, caster, outline: outlineRef.current }),
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

/** A caster's lamp shadow sprite, drawn only while the desk lamp is on. */
export const LampSprite = (props: LampSpriteProps) => {
  const isLampOn = useAtomValue(deskLampAtom);
  return isLampOn ? <LitSprite {...props} /> : null;
};
