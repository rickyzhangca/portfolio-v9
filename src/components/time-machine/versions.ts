import screenshot2018 from "@/assets/time-machine/2018.webp";
import screenshot2019 from "@/assets/time-machine/2019.webp";
import screenshot2022May from "@/assets/time-machine/2022-05.webp";
import screenshot2022Dec from "@/assets/time-machine/2022-12.webp";
import v8Screenshot from "@/assets/time-machine/v8.webp";

export interface PortfolioVersion {
  /** When it went live, "YYYY-MM"; shown as "Jan 2025" under its window. */
  date: string;
  id: string;
  /** Stand-in until the live page has loaded, shot at the open window's size. */
  screenshot: string;
  /** Accessible name of the live page's frame. */
  title: string;
  url: string;
}

/**
 * Static copies of portfolios that are no longer online, each under its own
 * path (`/<id>/`). They live in the separate `portfolio-archive` repository.
 */
export const ARCHIVE_ORIGIN = "https://archive.rickyzhang.me";

/**
 * Earlier portfolios, oldest first; each is its own deployed site. Capture a
 * new one's screenshot with `node tools/capture-time-machine.ts <id>`.
 */
export const EARLIER_VERSIONS: readonly PortfolioVersion[] = [
  {
    date: "2018-08",
    id: "2018",
    screenshot: screenshot2018,
    title: "Ricky’s portfolio from 2018, a Jekyll site",
    url: `${ARCHIVE_ORIGIN}/2018/`,
  },
  {
    date: "2019-08",
    id: "2019",
    screenshot: screenshot2019,
    title: "Ricky’s portfolio from 2019, made with Adobe Portfolio",
    url: `${ARCHIVE_ORIGIN}/2019/`,
  },
  {
    date: "2022-05",
    id: "2022-05",
    screenshot: screenshot2022May,
    title: "Ricky’s portfolio from May 2022",
    url: `${ARCHIVE_ORIGIN}/2022-05/`,
  },
  {
    date: "2022-12",
    id: "2022-12",
    screenshot: screenshot2022Dec,
    title: "Ricky’s portfolio from December 2022",
    url: `${ARCHIVE_ORIGIN}/2022-12/`,
  },
  {
    date: "2025-01",
    id: "v8",
    screenshot: v8Screenshot,
    title: "Ricky’s portfolio, version 8",
    url: "https://v8.rickyzhang.me",
  },
];

export const CURRENT_VERSION_LABEL = "Now";
