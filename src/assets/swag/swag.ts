import { shuffle } from "fast-shuffle";
import swag1 from "./1.webp";
import swag2 from "./2.webp";
import swag3 from "./3.webp";
import swag4 from "./4.webp";
import swag5 from "./5.webp";
import swag6 from "./6.webp";
import swag7 from "./7.webp";
import swag8 from "./8.webp";
import swag9 from "./9.webp";
import swag10 from "./10.webp";
import swag11 from "./11.webp";
import swag12 from "./12.webp";
import swag13 from "./13.webp";
import swag14 from "./14.webp";
import swag15 from "./15.webp";
import swag16 from "./16.webp";
import swag17 from "./17.webp";
import swag18 from "./18.webp";
import swag19 from "./19.webp";
import swag20 from "./20.webp";
import swag21 from "./21.webp";
import swag22 from "./22.webp";
import swag23 from "./23.webp";
import swag24 from "./24.webp";
import swag25 from "./25.webp";
import swag26 from "./26.webp";
import swag27 from "./27.webp";
import swag28 from "./28.webp";
import swag29 from "./29.webp";
import swag30 from "./30.webp";
import swag31 from "./31.webp";
import swag32 from "./32.webp";
import swag33 from "./33.webp";
import swag34 from "./34.webp";
import swag35 from "./35.webp";
import swag36 from "./36.webp";
import swag37 from "./37.webp";
import swag38 from "./38.webp";
import swag39 from "./39.webp";
import swag40 from "./40.webp";
import swag41 from "./41.webp";
import swag42 from "./42.webp";
import swag43 from "./43.webp";
import swag44 from "./44.webp";
import swag45 from "./45.webp";
import swag46 from "./46.webp";
import swag47 from "./47.webp";
import swag48 from "./48.webp";
import swag49 from "./49.webp";
import swag50 from "./50.webp";
import swag51 from "./51.webp";
import swag52 from "./52.webp";
import swag53 from "./53.webp";
import swag54 from "./54.webp";
import swag55 from "./55.webp";
import swag56 from "./56.webp";
import swag57 from "./57.webp";
import swag58 from "./58.webp";
import swag59 from "./59.webp";
import swag60 from "./60.webp";
import swag61 from "./61.webp";
import swag62 from "./62.webp";
import swag63 from "./63.webp";
import swag64 from "./64.webp";
import swag65 from "./65.webp";
import swag66 from "./66.webp";
import swag67 from "./67.webp";
import swag68 from "./68.webp";
import swag69 from "./69.webp";
import swag70 from "./70.webp";
import swag71 from "./71.webp";
import swag72 from "./72.webp";
import swag73 from "./73.webp";
import swag74 from "./74.webp";
import swag75 from "./75.webp";
import swag76 from "./76.webp";
import swag77 from "./77.webp";
import swag78 from "./78.webp";
import swag79 from "./79.webp";
import swag80 from "./80.webp";
import swag81 from "./81.webp";
import swag82 from "./82.webp";
import swag83 from "./83.webp";
import swag84 from "./84.webp";
import swag85 from "./85.webp";
import swag86 from "./86.webp";
import swag87 from "./87.webp";
import swag88 from "./88.webp";
import swag89 from "./89.webp";
import swag90 from "./90.webp";
import swag91 from "./91.webp";
import swag92 from "./92.webp";
import swag93 from "./93.webp";

const swags: { src: string; label: string; caption?: string }[] = [
  {
    src: swag1,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag2,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag3,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag4,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag5,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag6,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag7,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag8,
    label: "Framer Meetup - Toronto",
    caption: "Framer",
  },
  {
    src: swag9,
    label: "Framer Meetup - Toronto",
    caption: "Framer",
  },
  {
    src: swag10,
    label: "Framer Meetup - Toronto",
    caption: "Framer",
  },
  {
    src: swag11,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
  {
    src: swag12,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
  {
    src: swag13,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
  {
    src: swag14,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
  {
    src: swag15,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
  {
    src: swag16,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
  {
    src: swag17,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
  {
    src: swag18,
    label: "Wealthsimple office",
    caption: "Wealthsimple",
  },
  {
    src: swag19,
    label: "Wealthsimple office",
    caption: "Wealthsimple",
  },
  {
    src: swag20,
    label: "Wealthsimple office",
    caption: "Wealthsimple",
  },
  {
    src: swag21,
    label: "Designing for Fintech",
    caption: "DesignX x Intuit",
  },
  {
    src: swag22,
    label: "Wealthsimple office",
    caption: "Wealthsimple",
  },
  {
    src: swag23,
    label: "FUSE: A Designathon by UW/UX",
    caption: "UW/UX",
  },
  {
    src: swag24,
    label: "Wealthsimple office",
    caption: "Wealthsimple",
  },
  {
    src: swag25,
    label: "Designing for Fintech",
    caption: "DesignX x Intuit",
  },
  {
    src: swag26,
    label: "Wealthsimple office",
    caption: "Wealthsimple",
  },
  {
    src: swag27,
    label: "Wealthsimple's end of year gift",
    caption: "Wealthsimple",
  },
  {
    src: swag28,
    label: "FUSE: A Designathon by UW/UX",
    caption: "UW/UX",
  },
  {
    src: swag29,
    label: "React Toronto <> Supabase LW14 @ TempoLabs",
    caption: "Supabase",
  },
  {
    src: swag30,
    label: "Spark - UW/UX & UXL Design Conference",
    caption: "UW/UX x UXL",
  },
  {
    src: swag31,
    label: "Mintlify office",
    caption: "Mintlify",
  },
  {
    src: swag32,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Sentry",
  },
  {
    src: swag33,
    label: "Mintlify office",
    caption: "Mintlify",
  },
  {
    src: swag34,
    label: "RBC Amphacks 2019",
    caption: "RBC Amplify",
  },
  {
    src: swag35,
    label: "UX Round Table Networking",
    caption: "TMU UX",
  },
  {
    src: swag36,
    label: "Designing for Fintech",
    caption: "DesignX x Intuit",
  },
  {
    src: swag37,
    label: "Designing for Fintech",
    caption: "DesignX x Intuit",
  },
  {
    src: swag38,
    label: "RBC AIOps office",
    caption: "RBC",
  },
  {
    src: swag39,
    label: "Mintlify office",
    caption: "Mintlify",
  },
  {
    src: swag40,
    label: "Google Mountain View campus",
    caption: "Google",
  },
  {
    src: swag41,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Sentry",
  },
  {
    src: swag42,
    label: "QHacks 2019",
    caption: "QHacks",
  },
  {
    src: swag43,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Sentry",
  },
  {
    src: swag44,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Sentry",
  },
  {
    src: swag45,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag46,
    label: "Mosaic office",
    caption: "Mosaic",
  },
  {
    src: swag47,
    label: "Canadian Undergraduate Conference on Artificial Intelligence 2020",
    caption: "CUCAI",
  },
  {
    src: swag48,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag49,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag50,
    label: "Designing for Fintech",
    caption: "DesignX x Intuit",
  },
  {
    src: swag51,
    label: "Hack the North 2019",
    caption: "Hack the North",
  },
  {
    src: swag52,
    label: "Pantones & Patio 2024",
    caption: "DesignX",
  },
  {
    src: swag53,
    label: "Designing for Fintech",
    caption: "DesignX x Intuit",
  },
  {
    src: swag54,
    label: "Pantones & Patio 2024",
    caption: "DesignX",
  },
  {
    src: swag55,
    label: "Pantones & Patio 2023",
    caption: "DesignX",
  },
  {
    src: swag56,
    label: "Pantones & Patio 2022",
    caption: "DesignX",
  },
  {
    src: swag57,
    label: "Hack the North 2019",
    caption: "Hack the North",
  },
  {
    src: swag58,
    label: "RBC Amplify AmpExpo 2024",
    caption: "RBC Amplify",
  },
  {
    src: swag59,
    label: "Canadian Undergraduate Conference on Artificial Intelligence 2020",
    caption: "CUCAI",
  },
  {
    src: swag60,
    label: "Google Mountain View campus",
    caption: "Google",
  },
  {
    src: swag61,
    label: "FUSE: A Designathon by UW/UX",
    caption: "UW/UX",
  },
  {
    src: swag62,
    label: "Design for Scale",
    caption: "DesignX x Intuit",
  },
  {
    src: swag63,
    label: "RBC Amphacks 2019",
    caption: "RBC Amplify",
  },
  {
    src: swag64,
    label: "Spark - UW/UX & UXL Design Conference",
    caption: "UW/UX x UXL",
  },
  {
    src: swag65,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Sentry",
  },
  {
    src: swag66,
    label: "Hack the North 2019",
    caption: "Hack the North",
  },
  {
    src: swag67,
    label: "Pantones & Patio 2023",
    caption: "DesignX",
  },
  {
    src: swag68,
    label: "Hack the North 2019",
    caption: "Hack the North",
  },
  {
    src: swag69,
    label: "Spark - UW/UX & UXL Design Conference",
    caption: "UW/UX x UXL",
  },
  {
    src: swag70,
    label: "QHacks 2020",
    caption: "QHacks",
  },
  {
    src: swag71,
    label: "QHacks 2020",
    caption: "QHacks",
  },
  {
    src: swag72,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Sentry",
  },
  {
    src: swag73,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Rootly",
  },
  {
    src: swag74,
    label: "Mosaic office",
    caption: "Mosaic",
  },
  {
    src: swag75,
    label: "Spark - UW/UX & UXL Design Conference",
    caption: "UW/UX x UXL",
  },
  {
    src: swag76,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Rootly",
  },
  {
    src: swag77,
    label: "Design for Scale",
    caption: "DesignX x Intuit",
  },
  {
    src: swag78,
    label: "Design for Scale",
    caption: "DesignX x Intuit",
  },
  {
    src: swag79,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag80,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag81,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag82,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag83,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag84,
    label: "Ladders Conference 2019",
    caption: "DesignX",
  },
  {
    src: swag85,
    label: "Crafting Design's AI Moment",
    caption: "DesignX x Intuit",
  },
  {
    src: swag86,
    label: "Hack the North 2019",
    caption: "Hack the North",
  },
  {
    src: swag86,
    label: "Pantones & Patio 2022",
    caption: "DesignX",
  },
  {
    src: swag87,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Rootly",
  },
  {
    src: swag88,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Rootly",
  },
  {
    src: swag89,
    label: "Founder Mode Live: AI Startups & Scaling Lessons",
    caption: "Rootly",
  },
  {
    src: swag90,
    label: "Spark - UW/UX & UXL Design Conference",
    caption: "UW/UX x UXL",
  },
  {
    src: swag91,
    label: "MongoDB.local 2024",
    caption: "MongoDB",
  },
  {
    src: swag92,
    label: "React Toronto <> Supabase LW13 @ TempoLabs",
    caption: "Supabase",
  },
  {
    src: swag93,
    label: "Notion Toronto Community Meetup Aug 2024",
    caption: "Notion",
  },
];

export const shuffledSwags = shuffle(swags);
