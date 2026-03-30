import githubResumeLogo from "@/assets/resume/github.webp";
import mintlifyResumeLogo from "@/assets/resume/mintlify.webp";
import mosaicResumeLogo from "@/assets/resume/mosaic.webp";
import queensLogo from "@/assets/resume/queens.webp";
import rbcResumeLogo from "@/assets/resume/rbc.webp";
import wealthsimpleResumeLogo from "@/assets/resume/wealthsimple.webp";
import type { ResumeData } from "@/cards/registry";

export const resumeData: ResumeData = {
  header: {
    name: "Ricky Zhang",
    website: "https://rickyzhang.me",
    email: "ricky.zhang@queensu.ca",
    phone: "+1 647-514-6238",
  },
  education: {
    logo: queensLogo,
    degree: "BCH in Cognitive Science",
    institution: "Queen's University",
    years: "2017-2021",
    description:
      "Courses: Computer Science, Artificial Intelligence, Psychology, Linguistics",
  },
  experiences: [
    {
      company: "GitHub",
      logo: githubResumeLogo,
      title: "Senior Design Engineer, Core UX",
      caption: "03/2026 - Current",
      description: ["Exploring AI x design system"],
    },
    {
      company: "Wealthsimple",
      logo: wealthsimpleResumeLogo,
      title: "Design Engineer, Design Systems",
      caption: "09/2024 - 03/2026",
      description: [
        "Shipped web dark mode, snackbar, chart segments and animations, rolling ticker",
        "Shipped mobile redesign, bar charts, new font, gradients, swipeables",
        "Shipped Android native sheets",
        "Shipped iOS home screen widgets",
      ],
    },
    {
      company: "Mintlify",
      logo: mintlifyResumeLogo,
      title: "Design Engineer",
      caption: "06/2024 - 09/2024",
      description: [
        "Shipped new search & chat menu and Mintlify widget",
        "Shipped custom fonts, advanced footer, and Gitlab integration to users",
        "Shipped redesigned auth flows, onboarding, and support forms",
      ],
    },
    {
      company: "RBC",
      logo: rbcResumeLogo,
      title: "UX Engineer, AIOps",
      caption: "02/2023 - 06/2024",
      description: [
        "Owned product design and front-end for 4 AIOps products end-to-end",
        "Defined UI and experience strategy, implemented features to scale 2 ML products to consume complex data and serve multiple times more teams",
        "On the side, built a internal dev tool for data engineers managing PySpark jobs",
      ],
    },
    {
      company: "Mosaic Manufacturing",
      logo: mosaicResumeLogo,
      title: "Product Designer",
      caption:
        "05/2021 - 02/2023\u00a0\u00a0\u00a0Full-time \n 10/2020 - 04/2021\u00a0\u00a0\u00a0Part-time \n 05/2020 - 08/2020\u00a0\u00a0Intern",
      description: [
        "Built a scalable and multi-device design system with 64% less components",
        "Designed and helped building redesigned web app to deliver better UX",
        "Designed and built the UI for 3 3D printing devices",
        "Designed B2B solutions with insights from 20 exploratory user researches",
        "Designed materials for marketing, branding, packaging, fund raising, events",
      ],
    },
  ],
  skills: [
    {
      category: "Design",
      skills: ["Design system", "High-fidelity craft", "Vector tools"],
    },
    {
      category: "Front-end",
      skills: [
        "React, React Native, TypeScript",
        "Prototyping",
        "Component composition",
      ],
    },
    {
      category: "Domain knowledge",
      skills: ["Fintech", "Dev tools", "3D printing"],
    },
  ],
};

// Card/sheet size constants
export const RESUME_CARD_SIZE = { width: 240, height: 440 };
export const RESUME_SHEET_SIZE = {
  width: 840,
};
