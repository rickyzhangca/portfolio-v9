import type { CardGroupData } from "@/types/canvas";

export const data: CardGroupData[] = [
  {
    id: "rbc-group",
    position: { x: 100, y: 100 },
    zIndex: 1,
    cards: [
      {
        id: "rbc-company",
        type: "company",
        size: { width: 240, height: 360 },
        content: {
          title: "RBC",
          description: "Software Developer Intern",
          image: "/src/assets/covers/rbc-logo.webp",
        },
      },
      {
        id: "project-1",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "E-Commerce Platform",
          description:
            "A full-stack e-commerce platform with real-time inventory management, payment processing, and admin dashboard. Built with Next.js, Stripe, and PostgreSQL.",
          image: "/src/assets/rbc/amplify.webp",
          links: [
            {
              label: "View Demo",
              url: "#",
              icon: "default",
            },
            {
              label: "GitHub",
              url: "#",
              icon: "github",
            },
          ],
        },
      },
      {
        id: "project-2",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Task Management App",
          description:
            "A collaborative task management application with real-time updates and team collaboration features. Built with React and Firebase.",
          image: "/src/assets/rbc/product.webp",
          links: [
            {
              label: "View Demo",
              url: "#",
              icon: "default",
            },
            {
              label: "GitHub",
              url: "#",
              icon: "github",
            },
          ],
        },
      },
      {
        id: "project-3",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "PySpark Analytics",
          description:
            "Big data analytics pipeline using PySpark for processing large-scale datasets with real-time insights and reporting capabilities.",
          image: "/src/assets/rbc/pyspark.webp",
          links: [
            {
              label: "View Demo",
              url: "#",
              icon: "default",
            },
            {
              label: "GitHub",
              url: "#",
              icon: "github",
            },
          ],
        },
      },
      {
        id: "project-4",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Redesign",
          description:
            "Complete UI/UX redesign of internal tools with improved accessibility, performance, and user experience.",
          image: "/src/assets/rbc/redesign.webp",
          links: [
            {
              label: "View Demo",
              url: "#",
              icon: "default",
            },
            {
              label: "GitHub",
              url: "#",
              icon: "github",
            },
          ],
        },
      },
    ],
  },

  {
    id: "wealthsimple-group",
    position: { x: 500, y: 100 },
    zIndex: 2,
    cards: [
      {
        id: "wealthsimple-company",
        type: "company",
        size: { width: 240, height: 360 },
        content: {
          title: "Wealthsimple",
          description: "Frontend Developer",
          image: "/src/assets/covers/wealthsimple-logo.webp",
        },
      },
      {
        id: "project-5",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "AI Content Generator",
          description:
            "An AI-powered content generation tool for blog posts, social media, and marketing copy using advanced language models.",
          image: "/src/assets/wealthsimple/dark-mode.webp",
          links: [
            {
              label: "View Demo",
              url: "#",
              icon: "default",
            },
            {
              label: "GitHub",
              url: "#",
              icon: "github",
            },
          ],
        },
      },
      {
        id: "project-6",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Design System",
          description:
            "A reusable component library with accessible primitives, theming, and documentation.",
          image: "/src/assets/wealthsimple/data-viz.webp",
          links: [
            { label: "Docs", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-7",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Home Gradients",
          description:
            "Dynamic gradient backgrounds for landing pages with smooth animations and color transitions.",
          image: "/src/assets/wealthsimple/home-gradients.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-8",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Native Sheet",
          description:
            "Native spreadsheet component with formulas, formatting, and export capabilities for mobile apps.",
          image: "/src/assets/wealthsimple/native-sheet.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-9",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Profile Layout",
          description:
            "New user profile layout with improved navigation, settings organization, and personalization options.",
          image: "/src/assets/wealthsimple/new-profile-layout.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-10",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Snackbar",
          description:
            "Toast notification system with queue management, animations, and accessibility features.",
          image: "/src/assets/wealthsimple/snackbar.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-11",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Swipeable",
          description:
            "Gesture-based swipe actions for mobile interfaces with customizable triggers and feedback.",
          image: "/src/assets/wealthsimple/swipeable.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-12",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Ticker",
          description:
            "Real-time stock ticker component with live updates, charts, and price change indicators.",
          image: "/src/assets/wealthsimple/ticker.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-13",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Web Chart",
          description:
            "Interactive charting library for financial data with zooming, panning, and customization options.",
          image: "/src/assets/wealthsimple/web-chart.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-14",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Widget",
          description:
            "Embeddable widgets for third-party integration with customizable themes and branding options.",
          image: "/src/assets/wealthsimple/widget.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-15",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "WS Sans",
          description:
            "Custom typeface designed for financial applications with improved readability and brand consistency.",
          image: "/src/assets/wealthsimple/ws-sans.webp",
          links: [
            { label: "Docs", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
    ],
  },

  {
    id: "mintlify-group",
    position: { x: 900, y: 100 },
    zIndex: 3,
    cards: [
      {
        id: "mintlify-company",
        type: "company",
        size: { width: 240, height: 360 },
        content: {
          title: "Mintlify",
          description: "Software Engineer",
          image: "/src/assets/covers/mintlify-logo.webp",
        },
      },
      {
        id: "project-16",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Auth",
          description:
            "Authentication system with SSO, 2FA, and role-based access control for enterprise applications.",
          image: "/src/assets/mintlify/auth.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-17",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Chat",
          description:
            "A realtime chat app with presence, typing indicators, and offline-first caching.",
          image: "/src/assets/mintlify/chat.webp",
          links: [
            { label: "View", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-18",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Editor",
          description:
            "WYSIWYG editor with markdown support, syntax highlighting, and collaborative editing features.",
          image: "/src/assets/mintlify/editor.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-19",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Fonts",
          description:
            "Typography system with custom fonts, variable weights, and responsive scaling for documentation sites.",
          image: "/src/assets/mintlify/fonts.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-20",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Footer",
          description:
            "Customizable footer component with navigation, social links, and analytics integration.",
          image: "/src/assets/mintlify/footer.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-21",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "GitLab",
          description:
            "GitLab integration with CI/CD pipelines, issue tracking, and repository management features.",
          image: "/src/assets/mintlify/gitlab.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-22",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Support",
          description:
            "Customer support portal with ticket management, live chat, and knowledge base integration.",
          image: "/src/assets/mintlify/support.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
    ],
  },

  {
    id: "mosaic-group",
    position: { x: 1300, y: 100 },
    zIndex: 4,
    cards: [
      {
        id: "mosaic-company",
        type: "company",
        size: { width: 240, height: 360 },
        content: {
          title: "Mosaic",
          description: "Full Stack Developer",
          image: "/src/assets/covers/mosaic-logo.webp",
        },
      },
      {
        id: "project-23",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Analytics Dashboard",
          description:
            "A fast dashboard with filters, charts, and shareable views optimized for large datasets.",
          image: "/src/assets/mosaic/b2b.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-24",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Design System",
          description:
            "Component library with theming, documentation, and accessibility features for design consistency.",
          image: "/src/assets/mosaic/ds.webp",
          links: [
            { label: "Docs", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-25",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Graphic",
          description:
            "Graphic design tools with vector editing, layers, and export options for creative workflows.",
          image: "/src/assets/mosaic/graphic.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-26",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Icon",
          description:
            "Icon library with thousands of customizable icons in multiple formats and styles.",
          image: "/src/assets/mosaic/icon.webp",
          links: [
            { label: "View", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-27",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Packaging",
          description:
            "Automated packaging system for software distribution with versioning and dependency management.",
          image: "/src/assets/mosaic/packaging.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
      {
        id: "project-28",
        type: "project",
        size: { width: 240, height: 240 },
        content: {
          title: "Printers",
          description:
            "Printer management system with queue handling, driver support, and remote printing capabilities.",
          image: "/src/assets/mosaic/printers.webp",
          links: [
            { label: "Demo", url: "#", icon: "default" },
            { label: "GitHub", url: "#", icon: "github" },
          ],
        },
      },
    ],
  },

  {
    id: "contact-group",
    position: { x: 1700, y: 100 },
    zIndex: 5,
    cards: [
      {
        id: "contact-card",
        type: "contact",
        size: { width: 240, height: 240 },
        content: {
          title: "Let's Connect",
          description:
            "Feel free to reach out for collaborations or just a friendly chat!",
          links: [
            {
              label: "Email",
              url: "mailto:hello@example.com",
              icon: "email",
            },
            {
              label: "GitHub",
              url: "https://github.com",
              icon: "github",
            },
            {
              label: "LinkedIn",
              url: "https://linkedin.com",
              icon: "linkedin",
            },
          ],
        },
      },
    ],
  },
];
