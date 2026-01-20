import type { ResumeData } from "@/cards/registry";

export const resumeData: ResumeData = {
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

// Card/sheet size constants
export const RESUME_CARD_SIZE = { width: 240, height: 440 };
export const RESUME_SHEET_SIZE = {
  width: 840,
};
