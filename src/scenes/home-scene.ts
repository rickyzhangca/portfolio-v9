import mintlifyLogo from "@/assets/covers/mintlify-logo.webp";
import mosaicLogo from "@/assets/covers/mosaic-logo.webp";
import rbcLogo from "@/assets/covers/rbc-logo.webp";
import wealthsimpleLogo from "@/assets/covers/wealthsimple-logo.webp";
import afterMirrorContent from "@/assets/fun-projects/content/after-mirror.webp";
import beforeMirrorContent from "@/assets/fun-projects/content/before-mirror.webp";
import communityLoveContent from "@/assets/fun-projects/content/community-love.webp";
import slidesDemoContent from "@/assets/fun-projects/content/demo.webm";
import figKiwiContent from "@/assets/fun-projects/content/fig-kiwi.webp";
import fprintsContent from "@/assets/fun-projects/content/fprints.webp";
// Fun projects content images
import kiboUiContent from "@/assets/fun-projects/content/kibo-ui.mov";
import octiconsFigmaContent from "@/assets/fun-projects/content/octicons-figma.webp";
import octiconsWebContent from "@/assets/fun-projects/content/octicons-web.webp";
import paopaoContent from "@/assets/fun-projects/content/paopao.webp";
import spellbookContent from "@/assets/fun-projects/content/spellbook.webp";
import summarySlidesContent from "@/assets/fun-projects/content/summary-slides.webp";
import svgouiContent from "@/assets/fun-projects/content/svgoui.webp";
import twitterQuoteContent from "@/assets/fun-projects/content/twitter-quote.webp";
import appleIcon from "@/assets/fun-projects/icons/apple.webp";
import fprintsIcon from "@/assets/fun-projects/icons/fprints.webp";
// Fun projects icons
import kiboIcon from "@/assets/fun-projects/icons/kibo.webp";
import kiwiIcon from "@/assets/fun-projects/icons/kiwi.webp";
import mirrorIcon from "@/assets/fun-projects/icons/mirror.webp";
import octiconsIcon from "@/assets/fun-projects/icons/octicons.webp";
import paopaoIcon from "@/assets/fun-projects/icons/paopao.webp";
import slidesIcon from "@/assets/fun-projects/icons/slides.webp";
import spellbookIcon from "@/assets/fun-projects/icons/spellbook.webp";
import svgoIcon from "@/assets/fun-projects/icons/svgo.webp";
// MacBook stickers
import animeSticker from "@/assets/macbook/anime.webp";
import badmintonSticker from "@/assets/macbook/badminton.webp";
import catSticker from "@/assets/macbook/cat.webp";
import gameSticker from "@/assets/macbook/game.webp";
import hackathonSticker from "@/assets/macbook/hackathon.webp";
import marathonSticker from "@/assets/macbook/marathon.webp";
import turtleSticker from "@/assets/macbook/turtle.webp";
import auth from "@/assets/mintlify/auth.webp";
// Mintlify assets
import chat from "@/assets/mintlify/chat.webp";
import editor from "@/assets/mintlify/editor.webp";
import fonts from "@/assets/mintlify/fonts.webp";
import footer from "@/assets/mintlify/footer.webp";
import gitlab from "@/assets/mintlify/gitlab.webp";
import support from "@/assets/mintlify/support.webp";
import b2b from "@/assets/mosaic/b2b.webp";
// Mosaic assets
import ds from "@/assets/mosaic/ds.webp";
import graphic from "@/assets/mosaic/graphic.webp";
import icon from "@/assets/mosaic/icon.webp";
import packaging from "@/assets/mosaic/packaging.webp";
import printers from "@/assets/mosaic/printers.webp";
// Profile pic
import profilePic from "@/assets/profile-pic/ricky.webp";
import profilePicAlt from "@/assets/profile-pic/ricky-alt.webp";
import amplify from "@/assets/rbc/amplify.webp";
// RBC assets
import rbcProduct from "@/assets/rbc/product.webp";
import pyspark from "@/assets/rbc/pyspark.webp";
import redesign from "@/assets/rbc/redesign.webp";
import { shuffledSwags } from "@/assets/swag/swag";
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
// Wealthsimple assets
import wsSans from "@/assets/wealthsimple/ws-sans.webp";
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
        images: [profilePic, profilePicAlt],
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
            src: animeSticker,
            description: "I'm a seasoned anime fan",
            x: 12,
            y: 36,
            width: 88,
            height: 218,
          },
          {
            src: badmintonSticker,
            description: "I love playing badminton!",
            x: 84,
            y: 26,
            width: 120,
            height: 120,
          },
          {
            src: catSticker,
            description: "I love a lovely  long-hair grey cat",
            x: 30,
            y: 72,
            width: 327,
            height: 147,
          },
          {
            src: gameSticker,
            description: "I play a lot of Cities: Skylines 2",
            x: 36,
            y: 24,
            width: 185,
            height: 92,
          },
          {
            src: hackathonSticker,
            description: "I love hackthons, sometimes as a judge too",
            x: 85,
            y: 60,
            width: 120,
            height: 120,
          },
          {
            src: marathonSticker,
            description: "I have ran 7 marathons since 2023",
            x: 60,
            y: 28,
            width: 215,
            height: 105,
          },
          {
            src: turtleSticker,
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
            icon: kiboIcon,
            title: "Kibo UI",
            description: `I love design engineering, design systems and building components. So I'm enjoying creating components for the open source component library [Kibo UI](https://www.kibo-ui.com/) created by Vercel's engineer [Hayden Bleasel](https://twitter.com/haydenbleasel). More to come!\n\n![Kibo UI Content](${kiboUiContent})`,
            status: "Active",
          },
          {
            icon: svgoIcon,
            title: "SVGOUI",
            description: `When building the credit card component for Kibo UI, I had to deal with a number of credit card network icon SVGs. So I build a UI for SVGO to optimize them so I can publish them to [\`react-card-network-icons\`](https://www.npmjs.com/package/react-card-network-icons).\n\nSVGOUI is a UI for SVG optimizer tool [SVGO](https://github.com/svg/svgo). Comparing to the predecessor [SVGOMG](https://github.com/interlace-app/svgui), it runs on newer SVGO core and modern front-end stacks, has a more friendly UI, and packs a number of quality of life features.\n\nYou can try it out [here](https://svgoui.pages.dev/).\n\n![SVGOUI Content](${svgouiContent})`,
            status: "Maintaining",
          },
          {
            icon: fprintsIcon,
            title: "Fprints",
            description: `[Factorio](https://store.steampowered.com/app/427520/Factorio/) is a factory-building game where you design and build your own factories. Players can build complex layouts and share via encoded strings - blueprints.\n\nI created [Fprints](https://fprints.xyz). A platform where players can publish their blueprints and find inspiration from others. It now has over 152K visits, 550+ users, and stores nearly 400 blueprints.\n\n![Fprints Content](${fprintsContent})`,
            status: "Maintaining",
          },
          {
            icon: spellbookIcon,
            title: "Spellbook",
            description: `ChatGPT 4o's image generation capability had a huge leap forward in early 2025. It is better than ever on understanding prompts and adhering to instructions (that is written in natural language).\n\nSo I created [Spellbook](https://spellbook.space). A platform for people to share and grab prompts that really work - guaranteed to reliably generate images in a well defined style for any given subject.\n\n![Spellbook Content](${spellbookContent})`,
            status: "Active",
          },
          {
            icon: kiwiIcon,
            title: "fig-kiwi-toolbox",
            description: `In 2023, I had a vision of creating a tool that would help both designers and developers to make and maintain design system. Due to the closed ecosystem in Figma's nature, the first step I took was to crack how Figma encodes and decodes the data. So people can easily import/export/copy & paste component between tools.\n\nAnd [fig-kiwi-toolbox](https://github.com/interlace-app/fig-kiwi-toolbox) was born. It reads and decodes the Figma data you have in the clipboard into JSON. The toolbox is greatly inspired by Sketch team's Figma file importer and have inspired many other developers on Reddit.\n\n![fig-kiwi-toolbox Content](${figKiwiContent})`,
            status: "Archived",
          },
          {
            icon: mirrorIcon,
            title: "Mirror Actual Size",
            description: `[Figma Mirror](https://www.figma.com/mirror) is a useful tool for previewing and interacting with designs, but it has a major limitation: it always scales the content to fit the screen. This can be problematic when designing for IoT devices with different screen sizes, or when creating print materials. At Mosaic, we encountered this problem regularly, which made it difficult to properly prototype and test our designs.\n\n![Mirror Actual Size Before](${beforeMirrorContent})\n\nTo solve this issue, I created the Mirror Actual Size plugin for Figma. This plugin adds a wrapper to the content, which ensures that it is displayed at its actual size when mirrored to a device. For example, a business card will be shown at its actual size of 3.5" x 2.0" on an iPad, rather than being scaled to fill the screen.\n\n![Mirror Actual Size After](${afterMirrorContent})\n\nThe Mirror Actual Size plugin has become an essential tool for us at Mosaic, and it has also gained over 3.2k installs on the Figma Community without any marketing efforts. It has proven to be a valuable addition to Figma Mirror, and we have received positive feedback from users who have tried it.`,
            status: "Maintaining",
            link: {
              url: "https://www.figma.com/community/plugin/989887108667938748/mirror-actual-size",
              type: "Figma",
              count: 4100,
            },
          },
          {
            icon: slidesIcon,
            title: "Slides",
            description: `Many designers [create slide decks with Figma](https://www.figma.com/mirror), including myself. However, one limitation of Figma is that it does not have built-in controls for advancing or going back through the slides. This means that designers have to manually add these interactions, which can be time-consuming, especially for decks with many slides. Furthermore, when slides are re-ordered, it is easy to forget to update the interactions, which can lead to problems when presenting.\n\n![Slides](${twitterQuoteContent})\n\nTo make Figma a more practical presentation solution, I created the Slides plugin. This plugin automatically adds or updates the forward and backward interactions to the frames that the user selects.\n\n![Slides](${slidesDemoContent})\n\nThis saves time and ensures that the interactions are always up-to-date, even when slides are re-ordered. It makes Figma the most **practical presentation solution**. In 2024, Figma officially announced native Figma Slides (and broke Slides...). It has been a great ride!`,
            status: "Archived",
            link: {
              url: "https://www.figma.com/community/plugin/1050766825375940133/slides",
              type: "Figma",
              count: 13_600,
            },
          },
          {
            icon: appleIcon,
            title: "Apple summary slides",
            description: `In September 2019, Apple introduced a new visual language called Bento for use in their events, which is characterized by a series of well-organized summary slides. The design community has embraced this style, and many people have asked for a collection of these summary slides.\n\nIn response to this demand, I created a collection of Bento summary slides that is accessible on [web](https://apple-summary-slides.vercel.app/) and Figma.\n\n![Apple Summary Slides](${summarySlidesContent})\n\nThis collection has allowed over 14K designers and 30K visitors to easily access and get inspirations from the slides.\n\nAnd the community has loved it!\n\n![Apple Summary Slides](${communityLoveContent})`,
            status: "Active",
            link: {
              url: "https://www.figma.com/community/file/1150817983915754582",
              type: "Figma",
              count: 17_800,
            },
          },
          {
            icon: octiconsIcon,
            title: "Octicons Extended",
            description:
              `As a side project, I created octicons-extended, a growing collection of icons that allows designers and developers to bring more variety to their use of octicons by GitHub.\n\nGitHub's original octicons inspired our [icon system refresh](https://old.rickyzhang.me/) at Mosaic, but we found that it has limited coverage because it is tailored to GitHub's specific needs. With octicons-extended, I aim to expand the icon selection and empower more users.\n\nAs a designer and developer, I believe that both groups should have easy access to octicons-extended and be able to use it in their work. To make it accessible to a wide audience, I have made it available in the Figma community, where it is organized and easy to use.\n\n![Octicons Extended Figma](${octiconsFigmaContent})\n\nI have also created a Node and React build, as well as a website that allows users to quickly access the full iconset and copy SVG files. By providing these tools, I hope to make octicons-extended a valuable resource for designers and developers alike.\n\n![Octicons Extended web](${octiconsWebContent})\n\nTo reduce the friction of switching from octicons to octicons-extended, octicons-extended fully includes the original octicons and two packages share the same usage.\n\n` +
              "```typescript\n// using original octicons\nimport { ZapIcon } from '@primer/octicons-react';\n// switching to octicons-extended\nimport { ZapIcon } from 'octicons-extended-react';\n```",
            status: "Archived",
            link: {
              url: "https://www.figma.com/community/file/1150065417044869754/octicons-extended",
              type: "Figma",
              count: 557,
            },
          },
          {
            icon: paopaoIcon,
            title: "Paopao Stickers",
            description: `The Paopao stickers are a popular and well-known set of stickers in mainland China, and they have been used to create countless memes. However, they were only available at a low resolution of 32x32 until... \n\nI vectorized each single Paopao sticker with vector tools in Figma! It enables us to remix for even more funny memes. Users can duplicate the stickers in the Figma Community or [add the sticker set to Telegram](https://t.me/addstickers/tieba_paopao/).\n\n![Paopao Stickers](${paopaoContent})`,
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
        content: "My swag collection",
        color: "blue",
      },
    },
    swags: shuffledSwags,
  },
];
