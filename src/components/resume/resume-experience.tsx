import mintlifyLogo from "/src/assets/resume/mintlify.webp";
import mosaicLogo from "/src/assets/resume/mosaic.webp";
import rbcLogo from "/src/assets/resume/rbc.webp";
import wealthsimpleLogo from "/src/assets/resume/wealthsimple.webp";

interface Experience {
  company: string;
  logo: string;
  title: string;
  caption: string;
  description: string[];
}

const experiences: Experience[] = [
  {
    company: "Wealthsimple",
    logo: wealthsimpleLogo,
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
    logo: mintlifyLogo,
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
    logo: rbcLogo,
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
    logo: mosaicLogo,
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
    logo: mosaicLogo,
    title: "UI Designer/Developer",
    caption: `05/2020 - 08/2020 Intern ${"\u00a0"}${"\u00a0"}${"\u00a0"} 10/2020 - 04/2021 Part-time`,
    description: [
      "Designed the interface and experience of Palette 3, a 3D printing hardware, from concepts to hi-fi prototypes (shipped in Sep 2021)",
      "Crafted the interface and experience from scratch for two 3D printers",
    ],
  },
];

export const ResumeExperience = () => {
  return (
    <div className="flex gap-10">
      <p className="w-32 min-w-32 text-end font-medium text-lg">Experience</p>
      <div className="flex flex-col gap-7">
        {experiences.map((experience) => (
          <div
            className="flex items-start gap-3"
            key={`${experience.company}-${experience.title}`}
          >
            <img
              alt={experience.company}
              className="rounded-md outline outline-foreground1/20"
              height={28}
              src={experience.logo}
              width={28}
            />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 font-medium text-lg">
                <p>{experience.title}</p>
                <p className="text-foreground2">{experience.company}</p>
              </div>
              <ul className="list-disc pl-5">
                {experience.description.map((description) => (
                  <li className="mb-0.5" key={description}>
                    {description}
                  </li>
                ))}
              </ul>
              <p className="text-foreground2">{experience.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
