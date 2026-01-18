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
      size: { width: 240, height: 340 },
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
          description:
            "Custom typeface designed for financial applications with improved readability and brand consistency.",
          image: "/src/assets/wealthsimple/ws-sans.webp",
        },
      },
      {
        id: "project-8",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Native sheets",
          description:
            "Native spreadsheet component with formulas, formatting, and export capabilities for mobile apps.",
          image: "/src/assets/wealthsimple/native-sheet.webp",
        },
      },
      {
        id: "project-12",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web rolling ticker",
          description:
            "Real-time stock ticker component with live updates, charts, and price change indicators.",
          image: "/src/assets/wealthsimple/ticker.webp",
        },
      },
      {
        id: "project-6",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Data viz colors",
          description:
            "A reusable component library with accessible primitives, theming, and documentation.",
          image: "/src/assets/wealthsimple/data-viz.webp",
        },
      },
      {
        id: "project-14",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Redesigned securities widget",
          description:
            "Embeddable widgets for third-party integration with customizable themes and branding options.",
          image: "/src/assets/wealthsimple/widget.webp",
        },
      },
      {
        id: "project-13",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web chart segments + animations",
          description:
            "Interactive charting library for financial data with zooming, panning, and customization options.",
          image: "/src/assets/wealthsimple/web-chart.webp",
        },
      },
      {
        id: "project-7",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Home gradients",
          description:
            "Dynamic gradient backgrounds for landing pages with smooth animations and color transitions.",
          image: "/src/assets/wealthsimple/home-gradients.webp",
        },
      },
      {
        id: "project-9",
        type: "project",
        size: { width: 420 },
        content: {
          title: "New profile layout",
          description:
            "New user profile layout with improved navigation, settings organization, and personalization options.",
          image: "/src/assets/wealthsimple/new-profile-layout.webp",
        },
      },
      {
        id: "project-5",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web dark mode",
          description:
            "An AI-powered content generation tool for blog posts, social media, and marketing copy using advanced language models.",
          image: "/src/assets/wealthsimple/dark-mode.webp",
        },
      },
      {
        id: "project-11",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Swipeable components",
          description:
            "Gesture-based swipe actions for mobile interfaces with customizable triggers and feedback.",
          image: "/src/assets/wealthsimple/swipeable.webp",
        },
      },
      {
        id: "project-10",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Web snackbar",
          description:
            "Toast notification system with queue management, animations, and accessibility features.",
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
          description:
            "A realtime chat app with presence, typing indicators, and offline-first caching.",
          image: "/src/assets/mintlify/chat.webp",
        },
      },
      {
        id: "project-18",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Editor file tree",
          description:
            "WYSIWYG editor with markdown support, syntax highlighting, and collaborative editing features.",
          image: "/src/assets/mintlify/editor.webp",
        },
      },
      {
        id: "project-16",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Refreshed auth and onboarding",
          description:
            "Authentication system with SSO, 2FA, and role-based access control for enterprise applications.",
          image: "/src/assets/mintlify/auth.webp",
        },
      },
      {
        id: "project-22",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Dashboard support form",
          description:
            "Customer support portal with ticket management, live chat, and knowledge base integration.",
          image: "/src/assets/mintlify/support.webp",
        },
      },
      {
        id: "project-19",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Custom fonts",
          description:
            "Typography system with custom fonts, variable weights, and responsive scaling for documentation sites.",
          image: "/src/assets/mintlify/fonts.webp",
        },
      },
      {
        id: "project-20",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Advanced footer",
          description:
            "Customizable footer component with navigation, social links, and analytics integration.",
          image: "/src/assets/mintlify/footer.webp",
        },
      },
      {
        id: "project-21",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Gitlab configuration",
          description:
            "GitLab integration with CI/CD pipelines, issue tracking, and repository management features.",
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
          description:
            "A collaborative task management application with real-time updates and team collaboration features. Built with React and Firebase.",
          image: "/src/assets/rbc/product.webp",
        },
      },
      {
        id: "project-4",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Redesigned UI for larger data volumes",
          description:
            "Complete UI/UX redesign of internal tools with improved accessibility, performance, and user experience.",
          image: "/src/assets/rbc/redesign.webp",
        },
      },
      {
        id: "project-3",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Internal tool for managing PySpark jobs",
          description:
            "Big data analytics pipeline using PySpark for processing large-scale datasets with real-time insights and reporting capabilities.",
          image: "/src/assets/rbc/pyspark.webp",
        },
      },
      {
        id: "project-1",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Mentor and judge for 2 years of Amplify",
          description:
            "A full-stack e-commerce platform with real-time inventory management, payment processing, and admin dashboard. Built with Next.js, Stripe, and PostgreSQL.",
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
          description:
            "Component library with theming, documentation, and accessibility features for design consistency.",
          image: "/src/assets/mosaic/ds.webp",
        },
      },
      {
        id: "project-28",
        type: "project",
        size: { width: 420 },
        content: {
          title: "UI for 3 new 3D printers",
          description:
            "Printer management system with queue handling, driver support, and remote printing capabilities.",
          image: "/src/assets/mosaic/printers.webp",
        },
      },
      {
        id: "project-23",
        type: "project",
        size: { width: 420 },
        content: {
          title: "B2B service offerings from scratch",
          description:
            "A fast dashboard with filters, charts, and shareable views optimized for large datasets.",
          image: "/src/assets/mosaic/b2b.webp",
        },
      },
      {
        id: "project-26",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Refreshed icon system and pipeline",
          description:
            "Icon library with thousands of customizable icons in multiple formats and styles.",
          image: "/src/assets/mosaic/icon.webp",
        },
      },
      {
        id: "project-25",
        type: "project",
        size: { width: 420 },
        content: {
          title: "All sorts of print materials",
          description:
            "Graphic design tools with vector editing, layers, and export options for creative workflows.",
          image: "/src/assets/mosaic/graphic.webp",
        },
      },
      {
        id: "project-27",
        type: "project",
        size: { width: 420 },
        content: {
          title: "Packaging design with a unified language",
          description:
            "Automated packaging system for software distribution with versioning and dependency management.",
          image: "/src/assets/mosaic/packaging.webp",
        },
      },
    ],
  },
];
