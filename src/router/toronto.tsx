import { useEffect } from "react";
import { type MetaFunction, useNavigate } from "react-router";
import { absoluteUrl, SITE_NAME, SITE_URL, X_HANDLE } from "@/lib/site";

/** The street map's item in the home scene. */
const TORONTO_ITEM_ID = "streetmap-item";

const TITLE = `Tiny Toronto - ${SITE_NAME}`;
const DESCRIPTION = "Isometric Toronto.";
const IMAGE = { height: 630, path: "/toronto-og.webp", width: 1200 } as const;

export const meta: MetaFunction = () => {
  const url = `${SITE_URL}/toronto`;
  const image = absoluteUrl(IMAGE.path);
  return [
    { title: TITLE },
    { content: DESCRIPTION, name: "description" },
    // It lands on the home page, which is the page to index.
    { href: `${SITE_URL}/`, rel: "canonical", tagName: "link" },
    { content: "website", property: "og:type" },
    { content: SITE_NAME, property: "og:site_name" },
    { content: TITLE, property: "og:title" },
    { content: DESCRIPTION, property: "og:description" },
    { content: url, property: "og:url" },
    { content: image, property: "og:image" },
    { content: "image/webp", property: "og:image:type" },
    { content: String(IMAGE.width), property: "og:image:width" },
    { content: String(IMAGE.height), property: "og:image:height" },
    { content: TITLE, property: "og:image:alt" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: X_HANDLE, name: "twitter:creator" },
    { content: TITLE, name: "twitter:title" },
    { content: DESCRIPTION, name: "twitter:description" },
    { content: image, name: "twitter:image" },
    { content: TITLE, name: "twitter:image:alt" },
  ];
};

/**
 * /toronto opens the home page and hands it the street map to open: the
 * canvas rises as usual, then the camera glides to the map and unfolds it.
 */
export default function TorontoRoute() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/", { replace: true, state: { openItem: TORONTO_ITEM_ID } });
  }, [navigate]);
  return null;
}
