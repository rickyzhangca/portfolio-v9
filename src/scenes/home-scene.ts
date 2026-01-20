import { ABOUT_CARD_SIZE } from "@/cards/about/about-data";
import { RESUME_CARD_SIZE, resumeData } from "@/cards/resume/resume-data";
import type { CanvasItem } from "@/types/canvas";

const START_X = 80;
const START_Y = 200;

const GAP_X = 300;
const GAP_Y = 20;

export const initialItems: CanvasItem[] = [
  // resume - single item
  {
    id: "resume-item",
    kind: "single",
    position: { x: START_X - 40, y: START_Y + 440 },
    zIndex: 1,
    card: {
      id: "resume-card",
      kind: "resume",
      size: RESUME_CARD_SIZE,
      content: resumeData,
    },
  },
  // about - single item
  {
    id: "about-item",
    kind: "single",
    position: { x: START_X - 20 + RESUME_CARD_SIZE.width, y: START_Y + 440 },
    zIndex: 1,
    card: {
      id: "about-card",
      kind: "about",
      size: ABOUT_CARD_SIZE,
      content: {}, // About is markdown-driven
    },
  },
  // email - single item
  {
    id: "email-item",
    kind: "single",
    position: { x: 140, y: 60 },
    zIndex: 1,
    card: {
      id: "email-card",
      kind: "email",
      size: {},
      content: {
        link: {
          label: "ricky.zhang@queensu.ca",
          url: "mailto:ricky.zhang@queensu.ca",
        },
      },
    },
  },
  // socials - single item
  {
    id: "socials-item",
    kind: "single",
    position: { x: 800, y: 48 },
    zIndex: 1,
    card: {
      id: "socials-card",
      kind: "socials",
      size: {},
      content: {
        linkedinUrl: "https://www.linkedin.com/in/ricky-zhang/",
        twitterUrl: "https://x.com/rickyrickyriri",
      },
    },
  },
  // wealthsimple - stack
  {
    id: "wealthsimple-stack",
    kind: "stack",
    position: { x: START_X, y: START_Y },
    zIndex: 2,
    cover: {
      id: "wealthsimple-cover",
      kind: "cover",
      size: { width: 240, height: 340 },
      content: {
        company: "Wealthsimple",
        title: "Design Engineer, Design System",
        image: "/src/assets/covers/wealthsimple-logo.webp",
      },
    },
    stack: [
      {
        id: "project-15",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Wealthsimple Sans rollout",
          image: "/src/assets/wealthsimple/ws-sans.webp",
        },
      },
      {
        id: "project-8",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Native sheets",
          image: "/src/assets/wealthsimple/native-sheet.webp",
        },
      },
      {
        id: "project-12",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Web rolling ticker",
          image: "/src/assets/wealthsimple/ticker.webp",
        },
      },
      {
        id: "project-6",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Data viz colors",
          image: "/src/assets/wealthsimple/data-viz.webp",
        },
      },
      {
        id: "project-14",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Redesigned securities widget",
          image: "/src/assets/wealthsimple/widget.webp",
        },
      },
      {
        id: "project-13",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Web chart segments + animations",
          image: "/src/assets/wealthsimple/web-chart.webp",
        },
      },
      {
        id: "project-7",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Home gradients",
          image: "/src/assets/wealthsimple/home-gradients.webp",
        },
      },
      {
        id: "project-9",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "New profile layout",
          image: "/src/assets/wealthsimple/new-profile-layout.webp",
        },
      },
      {
        id: "project-5",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Web dark mode",
          image: "/src/assets/wealthsimple/dark-mode.webp",
        },
      },
      {
        id: "project-11",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Swipeable components",
          image: "/src/assets/wealthsimple/swipeable.webp",
        },
      },
      {
        id: "project-10",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Web snackbar",
          image: "/src/assets/wealthsimple/snackbar.webp",
        },
      },
    ],
  },
  // mintlify - stack
  {
    id: "mintlify-stack",
    kind: "stack",
    position: { x: START_X + GAP_X, y: START_Y + GAP_Y },
    zIndex: 3,
    cover: {
      id: "mintlify-cover",
      kind: "cover",
      size: { width: 240, height: 340 },
      content: {
        company: "Mintlify",
        title: "Design Engineer",
        image: "/src/assets/covers/mintlify-logo.webp",
      },
    },
    stack: [
      {
        id: "project-17",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "New search & chat and Mintlify widget",
          image: "/src/assets/mintlify/chat.webp",
        },
      },
      {
        id: "project-18",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Editor file tree",
          image: "/src/assets/mintlify/editor.webp",
        },
      },
      {
        id: "project-16",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Refreshed auth and onboarding",
          image: "/src/assets/mintlify/auth.webp",
        },
      },
      {
        id: "project-22",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Dashboard support form",
          image: "/src/assets/mintlify/support.webp",
        },
      },
      {
        id: "project-19",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Custom fonts",
          image: "/src/assets/mintlify/fonts.webp",
        },
      },
      {
        id: "project-20",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Advanced footer",
          image: "/src/assets/mintlify/footer.webp",
        },
      },
      {
        id: "project-21",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Gitlab configuration",
          image: "/src/assets/mintlify/gitlab.webp",
        },
      },
    ],
  },
  // rbc - stack
  {
    id: "rbc-stack",
    kind: "stack",
    position: { x: START_X + GAP_X * 2, y: START_Y + GAP_Y * 2 },
    zIndex: 1,
    cover: {
      id: "rbc-cover",
      kind: "cover",
      size: { width: 240, height: 340 },
      content: {
        company: "RBC",
        title: "UX Engineer, AIOps",
        image: "/src/assets/covers/rbc-logo.webp",
      },
    },
    stack: [
      {
        id: "project-2",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "New internal AIOps products",
          image: "/src/assets/rbc/product.webp",
        },
      },
      {
        id: "project-4",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Redesigned UI for larger data volumes",
          image: "/src/assets/rbc/redesign.webp",
        },
      },
      {
        id: "project-3",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Internal tool for managing PySpark jobs",
          image: "/src/assets/rbc/pyspark.webp",
        },
      },
      {
        id: "project-1",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Mentor and judge for 2 years of Amplify",
          image: "/src/assets/rbc/amplify.webp",
        },
      },
    ],
  },
  // mosaic - stack
  {
    id: "mosaic-stack",
    kind: "stack",
    position: { x: START_X + GAP_X * 3, y: START_Y + GAP_Y * 3 },
    zIndex: 4,
    cover: {
      id: "mosaic-cover",
      kind: "cover",
      size: { width: 240, height: 340 },
      content: {
        company: "Mosaic",
        title: "UI/UX Designer",
        image: "/src/assets/covers/mosaic-logo.webp",
      },
    },
    stack: [
      {
        id: "project-24",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Web + multi-device IoT design system",
          image: "/src/assets/mosaic/ds.webp",
        },
      },
      {
        id: "project-28",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "UI for 3 new 3D printers",
          image: "/src/assets/mosaic/printers.webp",
        },
      },
      {
        id: "project-23",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "B2B service offerings from scratch",
          image: "/src/assets/mosaic/b2b.webp",
        },
      },
      {
        id: "project-26",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Refreshed icon system and pipeline",
          image: "/src/assets/mosaic/icon.webp",
        },
      },
      {
        id: "project-25",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "All sorts of print materials",
          image: "/src/assets/mosaic/graphic.webp",
        },
      },
      {
        id: "project-27",
        kind: "project",
        size: { width: 350 },
        content: {
          title: "Unified packaging design",
          image: "/src/assets/mosaic/packaging.webp",
        },
      },
    ],
  },
  // sticky note - single item
  {
    id: "stickynote-item-1",
    kind: "single",
    position: { x: 640, y: 800 },
    zIndex: 5,
    card: {
      id: "stickynote-card-1",
      kind: "stickynote",
      size: { width: 240 },
      content: {
        content: "Fun projects",
        color: "green",
      },
    },
  },
  {
    id: "stickynote-item-2",
    kind: "single",
    position: { x: 920, y: 800 },
    zIndex: 5,
    card: {
      id: "swag-collection",
      kind: "stickynote",
      size: { width: 240 },
      content: {
        content: "Swag collection",
        color: "blue",
      },
    },
  },
  // profile pic - single item
  {
    id: "profilepic-item",
    kind: "single",
    position: { x: 32, y: 32 },
    zIndex: 1,
    card: {
      id: "profilepic-card",
      kind: "profilepic",
      size: { width: 100, height: 100 },
      content: {
        images: [
          "src/assets/profile-pic/ricky.webp",
          "src/assets/profile-pic/ricky-alt.webp",
        ],
        alt: "Profile pic",
      },
    },
  },
  // macbook - single item
  {
    id: "macbook-item",
    kind: "single",
    position: { x: 1200, y: 660 },
    zIndex: 3,
    card: {
      id: "macbook-card",
      kind: "macbook",
      size: { width: 345, height: 300 },
      content: {
        stickers: [
          {
            src: "/src/assets/stickers/example-sticker.png",
            description: "Example sticker",
            x: 50,
            y: 40,
            width: 60,
            height: 60,
          },
        ],
      },
    },
  },
];
