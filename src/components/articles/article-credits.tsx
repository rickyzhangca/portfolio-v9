import anthony from "@/content/articles/verification-asymmetry/assets/anthony-ung.webp";
import jerry from "@/content/articles/verification-asymmetry/assets/jerry-wang.webp";
import ryan from "@/content/articles/verification-asymmetry/assets/ryan-yao.webp";
import type { ArticleLocale } from "@/types/article";

const REVIEWERS = [
  { href: "https://www.jw.works/", image: jerry, name: "Jerry Wang" },
  { href: "https://ryanyao.design/", image: ryan, name: "Ryan Yao" },
  { href: "https://anthonyung.com/", image: anthony, name: "Anthony Ung" },
];

export function ArticleCredits({ locale }: { locale: ArticleLocale }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex -space-x-2">
        {REVIEWERS.map((reviewer) => (
          <a
            aria-label={reviewer.name}
            className="rounded-full focus-visible:outline-2"
            href={reviewer.href}
            key={reviewer.name}
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              alt={reviewer.name}
              className="h-10 w-10 rounded-full border-2 border-white"
              height={40}
              loading="lazy"
              src={reviewer.image}
              width={40}
            />
          </a>
        ))}
      </div>
      <p>
        {locale === "cn"
          ? "感谢 Jerry Wang、Ryan Yao 和 Anthony Ung 审阅这篇文章。"
          : "Thanks to Jerry Wang, Ryan Yao, and Anthony Ung for reviewing this article."}
      </p>
    </div>
  );
}
