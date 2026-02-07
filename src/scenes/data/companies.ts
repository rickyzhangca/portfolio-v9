import mintlifyLogo from "@/assets/covers/mintlify-logo.webp";
import mosaicLogo from "@/assets/covers/mosaic-logo.webp";
import rbcLogo from "@/assets/covers/rbc-logo.webp";
import wealthsimpleLogo from "@/assets/covers/wealthsimple-logo.webp";
import auth from "@/assets/mintlify/auth.webp";
import chat from "@/assets/mintlify/chat.webp";
import editor from "@/assets/mintlify/editor.webp";
import fonts from "@/assets/mintlify/fonts.webp";
import footer from "@/assets/mintlify/footer.webp";
import gitlab from "@/assets/mintlify/gitlab.webp";
import support from "@/assets/mintlify/support.webp";
import b2b from "@/assets/mosaic/b2b.webp";
import ds from "@/assets/mosaic/ds.webp";
import graphic from "@/assets/mosaic/graphic.webp";
import icon from "@/assets/mosaic/icon.webp";
import packaging from "@/assets/mosaic/packaging.webp";
import printers from "@/assets/mosaic/printers.webp";
import amplify from "@/assets/rbc/amplify.webp";
import rbcProduct from "@/assets/rbc/product.webp";
import pyspark from "@/assets/rbc/pyspark.webp";
import redesign from "@/assets/rbc/redesign.webp";
import darkMode from "@/assets/wealthsimple/dark-mode.webp";
import dataViz from "@/assets/wealthsimple/data-viz.webp";
import homeGradients from "@/assets/wealthsimple/home-gradients.webp";
import nativeSheet from "@/assets/wealthsimple/native-sheet.webp";
import newProfileLayout from "@/assets/wealthsimple/new-profile-layout.webp";
import snackbar from "@/assets/wealthsimple/snackbar.webp";
import swipeable from "@/assets/wealthsimple/swipeable.webp";
import ticker from "@/assets/wealthsimple/ticker.webp";
import webChart from "@/assets/wealthsimple/web-chart.webp";
import widget from "@/assets/wealthsimple/widget.webp";
import wsSans from "@/assets/wealthsimple/ws-sans.webp";
import type { CanvasStackItem } from "@/types/canvas";

const GAP_X = 300;
const GAP_Y = 20;
const START_X = 80;
const START_Y = 200;

export const wealthsimpleStack: CanvasStackItem = {
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
      image: wealthsimpleLogo,
    },
  },
  stack: [
    {
      id: "project-15",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Wealthsimple Sans rollout",
        image: wsSans,
      },
    },
    {
      id: "project-8",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Native sheets",
        image: nativeSheet,
      },
    },
    {
      id: "project-12",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Web rolling ticker",
        image: ticker,
      },
    },
    {
      id: "project-6",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Data viz colors",
        image: dataViz,
      },
    },
    {
      id: "project-14",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Redesigned securities widget",
        image: widget,
      },
    },
    {
      id: "project-13",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Web chart segments + animations",
        image: webChart,
      },
    },
    {
      id: "project-7",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Home gradients",
        image: homeGradients,
      },
    },
    {
      id: "project-9",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "New profile layout",
        image: newProfileLayout,
      },
    },
    {
      id: "project-5",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Web dark mode",
        image: darkMode,
      },
    },
    {
      id: "project-11",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Swipeable components",
        image: swipeable,
      },
    },
    {
      id: "project-10",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Web snackbar",
        image: snackbar,
      },
    },
  ],
};

export const mintlifyStack: CanvasStackItem = {
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
      image: mintlifyLogo,
    },
  },
  stack: [
    {
      id: "project-17",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "New search & chat and Mintlify widget",
        image: chat,
      },
    },
    {
      id: "project-18",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Editor file tree",
        image: editor,
      },
    },
    {
      id: "project-16",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Refreshed auth and onboarding",
        image: auth,
      },
    },
    {
      id: "project-22",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Dashboard support form",
        image: support,
      },
    },
    {
      id: "project-19",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Custom fonts",
        image: fonts,
      },
    },
    {
      id: "project-20",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Advanced footer",
        image: footer,
      },
    },
    {
      id: "project-21",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Gitlab configuration",
        image: gitlab,
      },
    },
  ],
};

export const rbcStack: CanvasStackItem = {
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
      image: rbcLogo,
    },
  },
  stack: [
    {
      id: "project-2",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "New internal AIOps products",
        image: rbcProduct,
      },
    },
    {
      id: "project-4",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Redesigned UI for larger data volumes",
        image: redesign,
      },
    },
    {
      id: "project-3",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Internal tool for managing PySpark jobs",
        image: pyspark,
      },
    },
    {
      id: "project-1",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Mentor and judge for 2 years of Amplify",
        image: amplify,
      },
    },
  ],
};

export const mosaicStack: CanvasStackItem = {
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
      image: mosaicLogo,
    },
  },
  stack: [
    {
      id: "project-24",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Web + multi-device IoT design system",
        image: ds,
      },
    },
    {
      id: "project-28",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "UI for 3 new 3D printers",
        image: printers,
      },
    },
    {
      id: "project-23",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "B2B service offerings from scratch",
        image: b2b,
      },
    },
    {
      id: "project-26",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Refreshed icon system and pipeline",
        image: icon,
      },
    },
    {
      id: "project-25",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "All sorts of print materials",
        image: graphic,
      },
    },
    {
      id: "project-27",
      kind: "project",
      size: { width: 350 },
      content: {
        title: "Unified packaging design",
        image: packaging,
      },
    },
  ],
};

export const companyStacks = [
  wealthsimpleStack,
  mintlifyStack,
  rbcStack,
  mosaicStack,
];
