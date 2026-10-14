import { readFileSync } from "node:fs";

const inter = readFileSync(
  new URL("./fonts/inter-latin-variable.woff2", import.meta.url)
).toString("base64");
const interItalic = readFileSync(
  new URL("./fonts/inter-italic-latin-variable.woff2", import.meta.url)
).toString("base64");
const playpenSans = readFileSync(
  new URL("./fonts/playpen-sans-latin-variable.woff2", import.meta.url)
).toString("base64");

export const PINNED_FONT_STYLESHEET = `
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(data:font/woff2;base64,${inter}) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "Inter";
  font-style: italic;
  font-weight: 400 700;
  font-display: swap;
  src: url(data:font/woff2;base64,${interItalic}) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "Playpen Sans";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(data:font/woff2;base64,${playpenSans}) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`;
