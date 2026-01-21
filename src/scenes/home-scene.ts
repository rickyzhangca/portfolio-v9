import { shuffledSwags } from "@/assets/swag/swag";
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
    position: { x: 1080, y: 48 },
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
            src: "/src/assets/macbook/anime.webp",
            description: "I'm a seasoned anime fan",
            x: 12,
            y: 36,
            width: 88,
            height: 218,
          },
          {
            src: "/src/assets/macbook/badminton.webp",
            description: "I love playing badminton!",
            x: 84,
            y: 26,
            width: 120,
            height: 120,
          },
          {
            src: "/src/assets/macbook/cat.webp",
            description: "I love a lovely  long-hair grey cat",
            x: 30,
            y: 72,
            width: 327,
            height: 147,
          },
          {
            src: "/src/assets/macbook/game.webp",
            description: "I play a lot of Cities: Skylines 2",
            x: 36,
            y: 24,
            width: 185,
            height: 92,
          },
          {
            src: "/src/assets/macbook/hackathon.webp",
            description: "I love hackthons, sometimes as a judge too",
            x: 85,
            y: 60,
            width: 120,
            height: 120,
          },
          {
            src: "/src/assets/macbook/marathon.webp",
            description: "I have ran 7 marathons since 2023",
            x: 60,
            y: 28,
            width: 215,
            height: 105,
          },
          {
            src: "/src/assets/macbook/turtle.webp",
            description: "Two turtlees are enjoying the sun bath next to me",
            x: 72,
            y: 74,
            width: 109,
            height: 102,
          },
        ],
      },
    },
  },
  // fun projects - funstack
  {
    id: "fun-projects-stack",
    kind: "funstack",
    position: { x: 700, y: 700 },
    zIndex: 6,
    card: {
      id: "fun-projects-card",
      kind: "funproject",
      size: { width: 360 },
      content: {
        items: [
          {
            icon: "/src/assets/fun-projects/icons/kibo.webp",
            title: "Kibo UI",
            description:
              "I love design engineering, design systems and building components. So I'm enjoying creating components for the open source component library [Kibo UI](https://www.kibo-ui.com/) created by Vercel's engineer [Hayden Bleasel](https://twitter.com/haydenbleasel). More to come!\n\n![Kibo UI Content](/src/assets/fun-projects/content/kibo-ui.mov)",
            status: "Active",
          },
          {
            icon: "/src/assets/fun-projects/icons/svgo.webp",
            title: "SVGOUI",
            description:
              "When building the credit card component for Kibo UI, I had to deal with a number of credit card network icon SVGs. So I build a UI for SVGO to optimize them so I can publish them to [`react-card-network-icons`](https://www.npmjs.com/package/react-card-network-icons).\n\nSVGOUI is a UI for SVG optimizer tool [SVGO](https://github.com/svg/svgo). Comparing to the predecessor [SVGOMG](https://github.com/interlace-app/svgui), it runs on newer SVGO core and modern front-end stacks, has a more friendly UI, and packs a number of quality of life features.\n\nYou can try it out [here](https://svgoui.pages.dev/).\n\n![SVGOUI Content](/src/assets/fun-projects/content/svgoui.webp)",
            status: "Maintaining",
          },
          {
            icon: "/src/assets/fun-projects/icons/fprints.webp",
            title: "Fprints",
            description:
              "[Factorio](https://store.steampowered.com/app/427520/Factorio/) is a factory-building game where you design and build your own factories. Players can build complex layouts and share via encoded strings - blueprints.\n\nI created [Fprints](https://fprints.xyz). A platform where players can publish their blueprints and find inspiration from others. It now has over 152K visits, 550+ users, and stores nearly 400 blueprints.\n\n![Fprints Content](/src/assets/fun-projects/content/fprints.webp)",
            status: "Maintaining",
          },
          {
            icon: "/src/assets/fun-projects/icons/spellbook.webp",
            title: "Spellbook",
            description:
              "ChatGPT 4o's image generation capability had a huge leap forward in early 2025. It is better than ever on understanding prompts and adhering to instructions (that is written in natural language).\n\nSo I created [Spellbook](https://spellbook.space). A platform for people to share and grab prompts that really work - guaranteed to reliably generate images in a well defined style for any given subject.\n\n![Spellbook Content](/src/assets/fun-projects/content/spellbook.webp)",
            status: "Active",
          },
          {
            icon: "/src/assets/fun-projects/icons/kiwi.webp",
            title: "fig-kiwi-toolbox",
            description:
              "In 2023, I had a vision of creating a tool that would help both designers and developers to make and maintain design system. Due to the closed ecosystem in Figma's nature, the first step I took was to crack how Figma encodes and decodes the data. So people can easily import/export/copy & paste component between tools.\n\nAnd [fig-kiwi-toolbox](https://github.com/interlace-app/fig-kiwi-toolbox) was born. It reads and decodes the Figma data you have in the clipboard into JSON. The toolbox is greatly inspired by Sketch team's Figma file importer and have inspired many other developers on Reddit.\n\n![fig-kiwi-toolbox Content](/src/assets/fun-projects/content/fig-kiwi.webp)",
            status: "Archived",
          },
          {
            icon: "/src/assets/fun-projects/icons/mirror.webp",
            title: "Mirror Actual Size",
            description:
              '[Figma Mirror](https://www.figma.com/mirror) is a useful tool for previewing and interacting with designs, but it has a major limitation: it always scales the content to fit the screen. This can be problematic when designing for IoT devices with different screen sizes, or when creating print materials. At Mosaic, we encountered this problem regularly, which made it difficult to properly prototype and test our designs.\n\n![Mirror Actual Size Before](/src/assets/fun-projects/content/before-mirror.webp)\n\nTo solve this issue, I created the Mirror Actual Size plugin for Figma. This plugin adds a wrapper to the content, which ensures that it is displayed at its actual size when mirrored to a device. For example, a business card will be shown at its actual size of 3.5" x 2.0" on an iPad, rather than being scaled to fill the screen.\n\n![Mirror Actual Size After](/src/assets/fun-projects/content/after-mirror.webp)\n\nThe Mirror Actual Size plugin has become an essential tool for us at Mosaic, and it has also gained over 3.2k installs on the Figma Community without any marketing efforts. It has proven to be a valuable addition to Figma Mirror, and we have received positive feedback from users who have tried it.',
            status: "Maintaining",
            link: {
              url: "https://www.figma.com/community/plugin/989887108667938748/mirror-actual-size",
              type: "Figma",
              count: 4100,
            },
          },
          {
            icon: "/src/assets/fun-projects/icons/slides.webp",
            title: "Slides",
            description:
              "Many designers [create slide decks with Figma](https://www.figma.com/mirror), including myself. However, one limitation of Figma is that it does not have built-in controls for advancing or going back through the slides. This means that designers have to manually add these interactions, which can be time-consuming, especially for decks with many slides. Furthermore, when slides are re-ordered, it is easy to forget to update the interactions, which can lead to problems when presenting.\n\n![Slides](/src/assets/fun-projects/content/twitter-quote.webp)\n\nTo make Figma a more practical presentation solution, I created the Slides plugin. This plugin automatically adds or updates the forward and backward interactions to the frames that the user selects.\n\n![Slides](/src/assets/fun-projects/content/demo.webm)\n\nThis saves time and ensures that the interactions are always up-to-date, even when slides are re-ordered. It makes Figma the most **practical presentation solution**. In 2024, Figma officially announced native Figma Slides (and broke Slides...). It has been a great ride!",
            status: "Archived",
            link: {
              url: "https://www.figma.com/community/plugin/1050766825375940133/slides",
              type: "Figma",
              count: 13_600,
            },
          },
          {
            icon: "/src/assets/fun-projects/icons/apple.webp",
            title: "Apple summary slides",
            description:
              "In September 2019, Apple introduced a new visual language called Bento for use in their events, which is characterized by a series of well-organized summary slides. The design community has embraced this style, and many people have asked for a collection of these summary slides.\n\nIn response to this demand, I created a collection of Bento summary slides that is accessible on [web](https://apple-summary-slides.vercel.app/) and Figma.\n\n![Apple Summary Slides](/src/assets/fun-projects/content/summary-slides.webp)\n\nThis collection has allowed over 14K designers and 30K visitors to easily access and get inspirations from the slides.\n\nAnd the community has loved it!\n\n![Apple Summary Slides](/src/assets/fun-projects/content/community-love.webp)",
            status: "Active",
            link: {
              url: "https://www.figma.com/community/file/1150817983915754582",
              type: "Figma",
              count: 17_800,
            },
          },
          {
            icon: "/src/assets/fun-projects/icons/octicons.webp",
            title: "Octicons Extended",
            description:
              "As a side project, I created octicons-extended, a growing collection of icons that allows designers and developers to bring more variety to their use of octicons by GitHub.\n\nGitHub's original octicons inspired our [icon system refresh](https://old.rickyzhang.me/) at Mosaic, but we found that it has limited coverage because it is tailored to GitHub's specific needs. With octicons-extended, I aim to expand the icon selection and empower more users.\n\nAs a designer and developer, I believe that both groups should have easy access to octicons-extended and be able to use it in their work. To make it accessible to a wide audience, I have made it available in the Figma community, where it is organized and easy to use.\n\n![Octicons Extended Figma](/src/assets/fun-projects/content/octicons-figma.webp)\n\nI have also created a Node and React build, as well as a website that allows users to quickly access the full iconset and copy SVG files. By providing these tools, I hope to make octicons-extended a valuable resource for designers and developers alike.\n\n![Octicons Extended web](/src/assets/fun-projects/content/octicons-web.webp)\n\nTo reduce the friction of switching from octicons to octicons-extended, octicons-extended fully includes the original octicons and two packages share the same usage.\n\n```typescript\n// using original octicons\nimport { ZapIcon } from '@primer/octicons-react';\n// switching to octicons-extended\nimport { ZapIcon } from 'octicons-extended-react';\n```",
            status: "Archived",
            link: {
              url: "https://www.figma.com/community/file/1150065417044869754/octicons-extended",
              type: "Figma",
              count: 557,
            },
          },
          {
            icon: "/src/assets/fun-projects/icons/paopao.webp",
            title: "Paopao Stickers",
            description:
              "The Paopao stickers are a popular and well-known set of stickers in mainland China, and they have been used to create countless memes. However, they were only available at a low resolution of 32x32 until... \n\nI vectorized each single Paopao sticker with vector tools in Figma! It enables us to remix for even more funny memes. Users can duplicate the stickers in the Figma Community or [add the sticker set to Telegram](https://t.me/addstickers/tieba_paopao/).\n\n![Paopao Stickers](/src/assets/fun-projects/content/paopao.webp)",
            status: "Maintaining",
            link: {
              url: "https://www.figma.com/community/file/1070232689050503920",
              type: "Figma",
              count: 664,
            },
          },
        ],
      },
    },
  },
  // swag collection - swagstack
  {
    id: "swag-stack",
    kind: "swagstack",
    position: { x: 860, y: 1000 },
    zIndex: 7,
    cover: {
      id: "swag-cover",
      kind: "swagcover",
      size: { width: 180, height: 180 },
      content: {
        content: "My Swag Collection",
        color: "blue",
      },
    },
    swags: shuffledSwags,
  },
];
