import type { MetaFunction } from "react-router";
import {
  absoluteUrl,
  PERSON_SCHEMA,
  SITE_DESCRIPTION,
  SITE_IMAGE,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  X_HANDLE,
} from "@/lib/site";

export const meta: MetaFunction = () => {
  const url = `${SITE_URL}/`;
  const image = absoluteUrl(SITE_IMAGE.path);
  return [
    { title: SITE_TITLE },
    { content: SITE_DESCRIPTION, name: "description" },
    { content: SITE_NAME, name: "author" },
    { href: url, rel: "canonical", tagName: "link" },
    { content: "website", property: "og:type" },
    { content: SITE_NAME, property: "og:site_name" },
    { content: "en_US", property: "og:locale" },
    { content: SITE_TITLE, property: "og:title" },
    { content: SITE_DESCRIPTION, property: "og:description" },
    { content: url, property: "og:url" },
    { content: image, property: "og:image" },
    { content: String(SITE_IMAGE.width), property: "og:image:width" },
    { content: String(SITE_IMAGE.height), property: "og:image:height" },
    { content: SITE_TITLE, property: "og:image:alt" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: X_HANDLE, name: "twitter:creator" },
    { content: SITE_TITLE, name: "twitter:title" },
    { content: SITE_DESCRIPTION, name: "twitter:description" },
    { content: image, name: "twitter:image" },
    { content: SITE_TITLE, name: "twitter:image:alt" },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": `${url}#person`,
            ...PERSON_SCHEMA,
            description: SITE_DESCRIPTION,
          },
          {
            "@type": "WebSite",
            author: { "@id": `${url}#person` },
            description: SITE_DESCRIPTION,
            inLanguage: "en",
            name: SITE_NAME,
            url,
          },
        ],
      },
    },
  ];
};

// The canvas has no visible page title; keep one in the document outline.
export default function HomeRoute() {
  return <h1 className="sr-only">{SITE_TITLE}</h1>;
}
