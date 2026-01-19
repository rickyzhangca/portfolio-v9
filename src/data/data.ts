import type { CanvasItem, ResumeData } from "@/types/canvas";

const START_X = 160;
const START_Y = 300;

const GAP_X = 320;
const GAP_Y = 20;

const resumeData: ResumeData = {
  header: {
    name: "Ricky Zhang",
    website: "https://rickyzhang.me",
    email: "ricky.zhang@queensu.ca",
    phone: "+1 647-514-6238",
  },
  education: {
    logo: "/src/assets/resume/queens.webp",
    degree: "BCH in Cognitive Science",
    institution: "Queen's University",
    years: "2017-2021",
    description:
      "Learned computer science, artificial intelligence, psychology, linguistics",
  },
  experiences: [
    {
      company: "Wealthsimple",
      logo: "/src/assets/resume/wealthsimple.webp",
      title: "Design Engineer, Design Systems",
      caption: "09/2024 - Current",
      description: [
        "Led front-end implementation of the web app dark mode, partnering with design and product teams to ship a polished experience",
        "Introduced the dynamic gradients to the mobile app for delightful experience",
        "Built new swipeable component used across the app for consistent interactions",
        "Learned and shipped Android native sheets and new iOS home screen widgets",
        "Maintaining and expanding the design system across web and mobile",
      ],
    },
    {
      company: "Mintlify",
      logo: "/src/assets/resume/mintlify.webp",
      title: "Design Engineer",
      caption: "06/2024 - 09/2024",
      description: [
        "Shipped new search & chat designs and Mintlify widget",
        "Brought custom fonts, advanced footer, and Gitlab integration to users",
        "Built the redesigns for auth flows, onboarding, and support forms",
      ],
    },
    {
      company: "RBC",
      logo: "/src/assets/resume/rbc.webp",
      title: "UX Engineer",
      caption: "02/2023 - 06/2024",
      description: [
        "Owned product design and front-end for 4 AIOps products end-to-end",
        "Defined UI and experience strategy, implemented features to scale 2 ML products to consume complex data and serve multiple times more teams",
        "On the side, built a internal dev tool for data engineers managing PySpark jobs",
      ],
    },
    {
      company: "Mosaic Manufacturing",
      logo: "/src/assets/resume/mosaic.webp",
      title: "Product Designer",
      caption: "05/2021 - 02/2023",
      description: [
        "Architected a scalable and multi-device design system with 64% less components (launched in Dec 2022)",
        "Led design and helped building an overhaul to the web app to deliver better user experience (launched in Apr 2022)",
        "Designed the B2B solutions with insights from exploratory user research on over 20 high-value customers",
        "Built the front-end for two 3D printers (shipped in Jan 2023)",
        "Designed materials for marketing, branding, packaging, fund raising, events",
      ],
    },
    {
      company: "Mosaic Manufacturing",
      logo: "/src/assets/resume/mosaic.webp",
      title: "UI Designer/Developer",
      caption:
        "05/2020 - 08/2020 Intern\u00a0\u00a0\u00a0 10/2020 - 04/2021 Part-time",
      description: [
        "Designed the interface and experience of Palette 3, a 3D printing hardware, from concepts to hi-fi prototypes (shipped in Sep 2021)",
        "Crafted the interface and experience from scratch for two 3D printers",
      ],
    },
  ],
  skills: [
    {
      category: "Design",
      skills: ["Design systems", "High fidelity", "Vector tools"],
    },
    {
      category: "Front-end",
      skills: [
        "React, React Native, TypeScript",
        "Components composition",
        "Prototyping",
      ],
    },
    {
      category: "Domains",
      skills: ["Fintech", "Dev tools", "IT and operations"],
    },
  ],
};

export const data: CanvasItem[] = [
  // resume - single item
  {
    id: "resume-item",
    kind: "single",
    position: { x: START_X - 40, y: START_Y + 440 },
    zIndex: 1,
    card: {
      id: "resume-card",
      type: "doc",
      size: { width: 240, height: 444 },
      content: {
        docType: "resume",
        data: resumeData,
      },
    },
  },
  // email - single item
  {
    id: "email-item",
    kind: "single",
    position: { x: 160, y: 80 },
    zIndex: 1,
    card: {
      id: "email-card",
      type: "email",
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
    position: { x: 800, y: 80 },
    zIndex: 1,
    card: {
      id: "socials-card",
      type: "socials",
      size: {},
      content: {
        linkedinUrl: "https://linkedin.com/in/rickyzhang",
        twitterUrl: "https://twitter.com/rickyzhang",
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
      type: "cover",
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
  // mintlify - stack
  {
    id: "mintlify-stack",
    kind: "stack",
    position: { x: START_X + GAP_X, y: START_Y + GAP_Y },
    zIndex: 3,
    cover: {
      id: "mintlify-cover",
      type: "cover",
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
  // rbc - stack
  {
    id: "rbc-stack",
    kind: "stack",
    position: { x: START_X + GAP_X * 2, y: START_Y + GAP_Y * 2 },
    zIndex: 1,
    cover: {
      id: "rbc-cover",
      type: "cover",
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
  // mosaic - stack
  {
    id: "mosaic-stack",
    kind: "stack",
    position: { x: START_X + GAP_X * 3, y: START_Y + GAP_Y * 3 },
    zIndex: 4,
    cover: {
      id: "mosaic-cover",
      type: "cover",
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
  // sticky note - single item
  {
    id: "stickynote-item-1",
    kind: "single",
    position: { x: 160, y: 160 },
    zIndex: 5,
    card: {
      id: "stickynote-card-1",
      type: "stickynote",
      size: { width: 240 },
      content: {
        content:
          "Hello! This is my portfolio. Feel free to explore my work by clicking on the company cards!",
        color: "yellow",
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
      type: "profilepic",
      size: { width: 120, height: 120 },
      content: {
        images: [
          "src/assets/profile-pic/ricky.webp",
          "src/assets/profile-pic/ricky-alt.webp",
        ],
        alt: "Profile pic",
      },
    },
  },
];
