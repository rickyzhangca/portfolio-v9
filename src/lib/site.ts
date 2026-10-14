export const SITE_URL = "https://rickyzhang.me";
export const SITE_NAME = "Ricky Zhang";
export const SITE_TITLE = "Ricky Zhang — Design Engineer";
export const SITE_DESCRIPTION =
  "Ricky Zhang is a design engineer specializing in design systems, passionate about fintech and dev tools. Projects, writing and experience.";
export const SITE_IMAGE = {
  height: 630,
  path: "/og.png",
  width: 1200,
} as const;

export const PROFILE_LINKS = {
  github: "https://github.com/rickyzhangca",
  linkedin: "https://www.linkedin.com/in/ricky-zhang/",
  x: "https://x.com/rickyrickyriri",
} as const;
export const X_HANDLE = "@rickyrickyriri";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}

/** Schema.org author used by the home page and every article. */
export const PERSON_SCHEMA = {
  "@type": "Person",
  jobTitle: "Design Engineer",
  name: SITE_NAME,
  sameAs: Object.values(PROFILE_LINKS),
  url: `${SITE_URL}/`,
} as const;
