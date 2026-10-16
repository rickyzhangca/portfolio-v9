// The fun-project icons as the desk lamp draws them: plastic keycaps printed
// with each icon, by project title. Loaded only once the lamp is on; the
// prints are served as files, not inlined into this module.
import appleGlyph from "@/assets/fun-projects/glyphs/apple.webp?no-inline";
import fprintsGlyph from "@/assets/fun-projects/glyphs/fprints.webp?no-inline";
import kiboGlyph from "@/assets/fun-projects/glyphs/kibo.webp?no-inline";
import kiwiGlyph from "@/assets/fun-projects/glyphs/kiwi.webp?no-inline";
import mirrorGlyph from "@/assets/fun-projects/glyphs/mirror.webp?no-inline";
import octiconsGlyph from "@/assets/fun-projects/glyphs/octicons.webp?no-inline";
import paopaoGlyph from "@/assets/fun-projects/glyphs/paopao.webp?no-inline";
import slidesGlyph from "@/assets/fun-projects/glyphs/slides.webp?no-inline";
import spellbookGlyph from "@/assets/fun-projects/glyphs/spellbook.webp?no-inline";
import svgoGlyph from "@/assets/fun-projects/glyphs/svgo.webp?no-inline";
import type { FunProjectKeycap } from "@/cards/registry";

/** The icons' usual cap: white plastic. */
const WHITE_PLASTIC = ["#f2f2f2", "#f2f2f2"] as const;

export const funProjectKeycaps: Readonly<Record<string, FunProjectKeycap>> = {
  "Kibo UI": { body: WHITE_PLASTIC, glyph: kiboGlyph },
  SVGOUI: { body: ["#2b2b2b", "#2b2b2b"], glyph: svgoGlyph },
  Fprints: { body: WHITE_PLASTIC, glyph: fprintsGlyph },
  Spellbook: { body: ["#21144a", "#633b98"], glyph: spellbookGlyph, grain: 1 },
  "fig-kiwi-toolbox": { body: WHITE_PLASTIC, glyph: kiwiGlyph },
  "Mirror Actual Size": { body: WHITE_PLASTIC, glyph: mirrorGlyph },
  Slides: { body: WHITE_PLASTIC, glyph: slidesGlyph },
  "Apple summary slides": { body: WHITE_PLASTIC, glyph: appleGlyph },
  "Octicons Extended": { body: ["#0a67d6", "#0a67d6"], glyph: octiconsGlyph },
  "Paopao Stickers": { body: WHITE_PLASTIC, glyph: paopaoGlyph },
};
