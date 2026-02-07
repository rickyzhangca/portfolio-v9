import animeSticker from "@/assets/macbook/anime.webp";
import badmintonSticker from "@/assets/macbook/badminton.webp";
import catSticker from "@/assets/macbook/cat.webp";
import gameSticker from "@/assets/macbook/game.webp";
import hackathonSticker from "@/assets/macbook/hackathon.webp";
import marathonSticker from "@/assets/macbook/marathon.webp";
import turtleSticker from "@/assets/macbook/turtle.webp";
import profilePic from "@/assets/profile-pic/ricky.webp";
import profilePicAlt from "@/assets/profile-pic/ricky-alt.webp";
import { shuffledSwags } from "@/assets/swag/swag";
import { ABOUT_CARD_SIZE } from "@/cards/about/about-data";
import { RESUME_CARD_SIZE, resumeData } from "@/cards/resume/resume-data";
import type {
  CanvasFunStackItem,
  CanvasSingleItem,
  CanvasSwagStackItem,
} from "@/types/canvas";
import { funProjects } from "./fun-projects";

export const resumeItem: CanvasSingleItem = {
  id: "resume-item",
  kind: "single",
  position: { x: 40, y: 640 },
  zIndex: 1,
  card: {
    id: "resume-card",
    kind: "resume",
    size: RESUME_CARD_SIZE,
    content: resumeData,
  },
};

export const aboutItem: CanvasSingleItem = {
  id: "about-item",
  kind: "single",
  position: { x: 60 + RESUME_CARD_SIZE.width, y: 640 },
  zIndex: 1,
  card: {
    id: "about-card",
    kind: "about",
    size: ABOUT_CARD_SIZE,
    content: {},
  },
};

export const emailItem: CanvasSingleItem = {
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
};

export const socialsItem: CanvasSingleItem = {
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
};

export const profilePicItem: CanvasSingleItem = {
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
};

export const macbookItem: CanvasSingleItem = {
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
};

export const funProjectsItem: CanvasFunStackItem = {
  id: "fun-projects-stack",
  kind: "funstack",
  position: { x: 700, y: 700 },
  zIndex: 6,
  card: {
    id: "fun-projects-card",
    kind: "funproject",
    size: { width: 360 },
    content: {
      items: funProjects,
    },
  },
};

export const swagItem: CanvasSwagStackItem = {
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
};

export const singleItems = [
  resumeItem,
  aboutItem,
  emailItem,
  socialsItem,
  profilePicItem,
  macbookItem,
  funProjectsItem,
  swagItem,
];
