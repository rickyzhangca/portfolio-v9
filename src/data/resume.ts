export const resumeConfig = {
  name: "Your Name",
  headline: "Design Engineer",
  location: "Toronto, ON",
  email: "you@example.com",
  links: [
    { label: "Portfolio", url: "https://yourdomain.com" },
    { label: "GitHub", url: "https://github.com/yourhandle" },
    { label: "LinkedIn", url: "https://linkedin.com/in/yourhandle" },
  ],
  pdfUrl: "/resume.pdf",
  summary:
    "Product-minded frontend engineer who ships polished UI, scalable systems, and fast iterations.",
  experience: [
    {
      company: "Company",
      title: "Role",
      period: "2023 - Present",
      bullets: [
        "Built and shipped user-facing features with React and TypeScript.",
        "Partnered with design to iterate quickly and raise the quality bar.",
        "Improved performance and reliability through profiling and refactors.",
      ],
    },
  ],
  skills: [
    "React",
    "TypeScript",
    "Framer Motion",
    "CSS",
    "Design Systems",
    "Accessibility",
  ],
  education: [{ school: "School", degree: "Degree", period: "2019 - 2023" }],
} as const;

