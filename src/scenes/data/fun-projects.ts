import afterMirrorContent from "@/assets/fun-projects/content/after-mirror.webp";
import beforeMirrorContent from "@/assets/fun-projects/content/before-mirror.webp";
import communityLoveContent from "@/assets/fun-projects/content/community-love.webp";
import slidesDemoContent from "@/assets/fun-projects/content/demo.webm";
import figKiwiContent from "@/assets/fun-projects/content/fig-kiwi.webp";
import fprintsContent from "@/assets/fun-projects/content/fprints.webp";
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
import kiboIcon from "@/assets/fun-projects/icons/kibo.webp";
import kiwiIcon from "@/assets/fun-projects/icons/kiwi.webp";
import mirrorIcon from "@/assets/fun-projects/icons/mirror.webp";
import octiconsIcon from "@/assets/fun-projects/icons/octicons.webp";
import paopaoIcon from "@/assets/fun-projects/icons/paopao.webp";
import slidesIcon from "@/assets/fun-projects/icons/slides.webp";
import spellbookIcon from "@/assets/fun-projects/icons/spellbook.webp";
import svgoIcon from "@/assets/fun-projects/icons/svgo.webp";
import type { FunProjectItem } from "@/cards/registry";

export const funProjects: FunProjectItem[] = [
  {
    icon: kiboIcon,
    title: "Kibo UI",
    description: "I love design engineering, design systems and building components. So I'm enjoying creating components for the open source component library [Kibo UI](https://www.kibo-ui.com/) created by Vercel's engineer [Hayden Bleasel](https://twitter.com/haydenbleasel). More to come!\n\n![Kibo UI Content](" + kiboUiContent + ")",
    status: "Active",
  },
  {
    icon: svgoIcon,
    title: "SVGOUI",
    description: "When building the credit card component for Kibo UI, I had to deal with a number of credit card network icon SVGs. So I build a UI for SVGO to optimize them so I can publish them to react-card-network-icons.\n\nSVGOUI is a UI for SVG optimizer tool [SVGO](https://github.com/svg/svgo). Comparing to the predecessor [SVGOMG](https://github.com/interlace-app/svgui), it runs on newer SVGO core and modern front-end stacks, has a more friendly UI, and packs a number of quality of life features.\n\nYou can try it out [here](https://svgoui.pages.dev/).\n\n![SVGOUI Content](" + svgouiContent + ")",
    status: "Maintaining",
  },
  {
    icon: fprintsIcon,
    title: "Fprints",
    description: "[Factorio](https://store.steampowered.com/app/427520/Factorio/) is a factory-building game where you design and build your own factories. Players can build complex layouts and share via encoded strings - blueprints.\n\nI created [Fprints](https://fprints.xyz). A platform where players can publish their blueprints and find inspiration from others. It now has over 152K visits, 550+ users, and stores nearly 400 blueprints.\n\n![Fprints Content](" + fprintsContent + ")",
    status: "Maintaining",
  },
  {
    icon: spellbookIcon,
    title: "Spellbook",
    description: "ChatGPT 4o's image generation capability had a huge leap forward in early 2025. It is better than ever on understanding prompts and adhering to instructions (that is written in natural language).\n\nSo I created [Spellbook](https://spellbook.space). A platform for people to share and grab prompts that really work - guaranteed to reliably generate images in a well defined style for any given subject.\n\n![Spellbook Content](" + spellbookContent + ")",
    status: "Active",
  },
  {
    icon: kiwiIcon,
    title: "fig-kiwi-toolbox",
    description: "In 2023, I had a vision of creating a tool that would help both designers and developers to make and maintain design system. Due to the closed ecosystem in Figma's nature, the first step I took was to crack how Figma encodes and decodes the data. So people can easily import/export/copy & paste component between tools.\n\nAnd [fig-kiwi-toolbox](https://github.com/interlace-app/fig-kiwi-toolbox) was born. It reads and decodes the Figma data you have in the clipboard into JSON. The toolbox is greatly inspired by Sketch team's Figma file importer and have inspired many other developers on Reddit.\n\n![fig-kiwi-toolbox Content](" + figKiwiContent + ")",
    status: "Archived",
  },
  {
    icon: mirrorIcon,
    title: "Mirror Actual Size",
    description: "[Figma Mirror](https://www.figma.com/mirror) is a useful tool for previewing and interacting with designs, but it has a major limitation: it always scales the content to fit the screen. This can be problematic when designing for IoT devices with different screen sizes, or when creating print materials. At Mosaic, we encountered this problem regularly, which made it difficult to properly prototype and test our designs.\n\n![Mirror Actual Size Before](" + beforeMirrorContent + ")\n\nTo solve this issue, I created the Mirror Actual Size plugin for Figma. This plugin adds a wrapper to the content, which ensures that it is displayed at its actual size when mirrored to a device. For example, a business card will be shown at its actual size of 3.5\" x 2.0\" on an iPad, rather than being scaled to fill the screen.\n\n![Mirror Actual Size After](" + afterMirrorContent + ")\n\nThe Mirror Actual Size plugin has become an essential tool for us at Mosaic, and it has also gained over 3.2k installs on the Figma Community without any marketing efforts. It has proven to be a valuable addition to Figma Mirror, and we have received positive feedback from users who have tried it.",
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
    description: "Many designers create slide decks with Figma, including myself. However, one limitation of Figma is that it does not have built-in controls for advancing or going back through the slides. This means that designers have to manually add these interactions, which can be time-consuming, especially for decks with many slides. Furthermore, when slides are re-ordered, it is easy to forget to update the interactions, which can lead to problems when presenting.\n\n![Slides](" + twitterQuoteContent + ")\n\nTo make Figma a more practical presentation solution, I created the Slides plugin. This plugin automatically adds or updates the forward and backward interactions to the frames that the user selects.\n\n![Slides](" + slidesDemoContent + ")\n\nThis saves time and ensures that the interactions are always up-to-date, even when slides are re-ordered. It makes Figma the most practical presentation solution. In 2024, Figma officially announced native Figma Slides (and broke Slides...). It has been a great ride!",
    status: "Archived",
    link: {
      url: "https://www.figma.com/community/plugin/1050766825375940133/slides",
      type: "Figma",
      count: 13600,
    },
  },
  {
    icon: appleIcon,
    title: "Apple summary slides",
    description: "In September 2019, Apple introduced a new visual language called Bento for use in their events, which is characterized by a series of well-organized summary slides. The design community has embraced this style, and many people have asked for a collection of these summary slides.\n\nIn response to this demand, I created a collection of Bento summary slides that is accessible on [web](https://apple-summary-slides.vercel.app/) and Figma.\n\n![Apple Summary Slides](" + summarySlidesContent + ")\n\nThis collection has allowed over 14K designers and 30K visitors to easily access and get inspirations from the slides.\n\nAnd the community has loved it!\n\n![Apple Summary Slides](" + communityLoveContent + ")",
    status: "Active",
    link: {
      url: "https://www.figma.com/community/file/1150817983915754582",
      type: "Figma",
      count: 17800,
    },
  },
  {
    icon: octiconsIcon,
    title: "Octicons Extended",
    description: "As a side project, I created octicons-extended, a growing collection of icons that allows designers and developers to bring more variety to their use of octicons by GitHub.\n\nGitHub's original octicons inspired our icon system refresh at Mosaic, but we found that it has limited coverage because it is tailored to GitHub's specific needs. With octicons-extended, I aim to expand the icon selection and empower more users.\n\nAs a designer and developer, I believe that both groups should have easy access to octicons-extended and be able to use it in their work. To make it accessible to a wide audience, I have made it available in the Figma community, where it is organized and easy to use.\n\n![Octicons Extended Figma](" + octiconsFigmaContent + ")\n\nI have also created a Node and React build, as well as a website that allows users to quickly access the full iconset and copy SVG files. By providing these tools, I hope to make octicons-extended a valuable resource for designers and developers alike.\n\n![Octicons Extended web](" + octiconsWebContent + ")\n\nTo reduce the friction of switching from octicons to octicons-extended, octicons-extended fully includes the original octicons and two packages share the same usage.\n\n```typescript\n// using original octicons\nimport { ZapIcon } from '@primer/octicons-react';\n// switching to octicons-extended\nimport { ZapIcon } from 'octicons-extended-react';\n```",
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
    description: "The Paopao stickers are a popular and well-known set of stickers in mainland China, and they have been used to create countless memes. However, they were only available at a low resolution of 32x32 until... \n\nI vectorized each single Paopao sticker with vector tools in Figma! It enables us to remix for even more funny memes. Users can duplicate the stickers in the Figma Community or add the sticker set to Telegram.\n\n![Paopao Stickers](" + paopaoContent + ")",
    status: "Maintaining",
    link: {
      url: "https://www.figma.com/community/file/1070232689050503920",
      type: "Figma",
      count: 664,
    },
  },
];
