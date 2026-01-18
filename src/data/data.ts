import { resumeConfig } from "@/data/resume";
import type { CardGroupData } from "@/types/canvas";

const START_X = 160;
const START_Y = 300;

const GAP_X = 320;
const GAP_Y = 20;

export const data: CardGroupData[] = [
  // resume
  {
    id: "resume-group",
    position: { x: START_X + 60, y: START_Y + 440 },
    zIndex: 1,
    cover: {
      id: "resume-card",
      type: "resume",
      size: { width: 240, height: 400 },
      content: { pdfUrl: resumeConfig.pdfUrl },
    },
    projects: [],
  },
  // wealthsimple
  {
    id: "wealthsimple-group",
    position: { x: START_X, y: START_Y },
    zIndex: 2,
    cover: {
      id: "wealthsimple-company",
      type: "company",
      size: { width: 240 },
      content: {
        company: "Wealthsimple",
        title: "Design Engineer, Design System",
        image: "/src/assets/covers/wealthsimple-logo.webp",
      },
    },
    projects: [
      {
        id: "project-15",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Wealthsimple Sans rollout",
          image: "/src/assets/wealthsimple/ws-sans.webp",
        },
      },
      {
        id: "project-8",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Native sheets",
          image: "/src/assets/wealthsimple/native-sheet.webp",
        },
      },
      {
        id: "project-12",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web rolling ticker",
          image: "/src/assets/wealthsimple/ticker.webp",
        },
      },
      {
        id: "project-6",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Data viz colors",
          image: "/src/assets/wealthsimple/data-viz.webp",
        },
      },
      {
        id: "project-14",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Redesigned securities widget",
          image: "/src/assets/wealthsimple/widget.webp",
        },
      },
      {
        id: "project-13",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web chart segments + animations",
          image: "/src/assets/wealthsimple/web-chart.webp",
        },
      },
      {
        id: "project-7",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Home gradients",
          image: "/src/assets/wealthsimple/home-gradients.webp",
        },
      },
      {
        id: "project-9",
        type: "project",
        size: { width: 420 },
        content: {
          title: "New profile layout",
          image: "/src/assets/wealthsimple/new-profile-layout.webp",
        },
      },
      {
        id: "project-5",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web dark mode",
          image: "/src/assets/wealthsimple/dark-mode.webp",
        },
      },
      {
        id: "project-11",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Swipeable components",
          image: "/src/assets/wealthsimple/swipeable.webp",
        },
      },
      {
        id: "project-10",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web snackbar",
          image: "/src/assets/wealthsimple/snackbar.webp",
        },
      },
    ],
  },
  // mintlify
  {
    id: "mintlify-group",
    position: { x: START_X + GAP_X, y: START_Y + GAP_Y },
    zIndex: 3,
    cover: {
      id: "mintlify-company",
      type: "company",
      size: { width: 240 },
      content: {
        company: "Mintlify",
        title: "Design Engineer",
        image: "/src/assets/covers/mintlify-logo.webp",
      },
    },
    projects: [
      {
        id: "project-17",
        type: "project",
        size: { width: 420 },
        content: {
          title: "New search & chat and Mintlify widget",
          image: "/src/assets/mintlify/chat.webp",
        },
      },
      {
        id: "project-18",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Editor file tree",
          image: "/src/assets/mintlify/editor.webp",
        },
      },
      {
        id: "project-16",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Refreshed auth and onboarding",
          image: "/src/assets/mintlify/auth.webp",
        },
      },
      {
        id: "project-22",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Dashboard support form",
          image: "/src/assets/mintlify/support.webp",
        },
      },
      {
        id: "project-19",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Custom fonts",
          image: "/src/assets/mintlify/fonts.webp",
        },
      },
      {
        id: "project-20",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Advanced footer",
          image: "/src/assets/mintlify/footer.webp",
        },
      },
      {
        id: "project-21",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Gitlab configuration",
          image: "/src/assets/mintlify/gitlab.webp",
        },
      },
    ],
  },
  // rbc
  {
    id: "rbc-group",
    position: { x: START_X + GAP_X * 2, y: START_Y + GAP_Y * 2 },
    zIndex: 1,
    cover: {
      id: "rbc-company",
      type: "company",
      size: { width: 240 },
      content: {
        company: "RBC",
        title: "UX Engineer, AIOps",
        image: "/src/assets/covers/rbc-logo.webp",
      },
    },
    projects: [
      {
        id: "project-2",
        type: "project",
        size: { width: 420 },
        content: {
          title: "New internal AIOps products",
          image: "/src/assets/rbc/product.webp",
        },
      },
      {
        id: "project-4",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Redesigned UI for larger data volumes",
          image: "/src/assets/rbc/redesign.webp",
        },
      },
      {
        id: "project-3",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Internal tool for managing PySpark jobs",
          image: "/src/assets/rbc/pyspark.webp",
        },
      },
      {
        id: "project-1",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Mentor and judge for 2 years of Amplify",
          image: "/src/assets/rbc/amplify.webp",
        },
      },
    ],
  },
  // mosaic
  {
    id: "mosaic-group",
    position: { x: START_X + GAP_X * 3, y: START_Y + GAP_Y * 3 },
    zIndex: 4,
    cover: {
      id: "mosaic-company",
      type: "company",
      size: { width: 240 },
      content: {
        company: "Mosaic",
        title: "UI/UX Designer",
        image: "/src/assets/covers/mosaic-logo.webp",
      },
    },
    projects: [
      {
        id: "project-24",
        type: "project",
        size: { width: 420 },
        content: {
          title: "A web and multi-device IoT design system",
          image: "/src/assets/mosaic/ds.webp",
        },
      },
      {
        id: "project-28",
        type: "project",
        size: { width: 420 },
        content: {
          title: "UI for 3 new 3D printers",
          image: "/src/assets/mosaic/printers.webp",
        },
      },
      {
        id: "project-23",
        type: "project",
        size: { width: 420 },
        content: {
          title: "B2B service offerings from scratch",
          image: "/src/assets/mosaic/b2b.webp",
        },
      },
      {
        id: "project-26",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Refreshed icon system and pipeline",
          image: "/src/assets/mosaic/icon.webp",
        },
      },
      {
        id: "project-25",
        type: "project",
        size: { width: 420 },
        content: {
          title: "All sorts of print materials",
          image: "/src/assets/mosaic/graphic.webp",
        },
      },
      {
        id: "project-27",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Packaging design with a unified language",
          image: "/src/assets/mosaic/packaging.webp",
        },
      },
    ],
  },
];
