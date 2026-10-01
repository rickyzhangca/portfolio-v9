import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Link, useLocation } from "react-router";
import { ArticleImage } from "./article-image";

function Heading({ children, id, ...props }: ComponentProps<"h2">) {
  const location = useLocation();
  return (
    <h2 id={id} {...props}>
      <Link
        className="heading-link"
        replace
        state={location.state}
        to={`${location.pathname}#${id}`}
      >
        {children}
      </Link>
    </h2>
  );
}

function ArticleLink({ href, ...props }: ComponentProps<"a">) {
  const location = useLocation();
  if (href?.startsWith("#")) {
    return (
      <Link
        replace
        state={location.state}
        to={`${location.pathname}${href}`}
        {...props}
      />
    );
  }
  return (
    <a
      href={href}
      {...(href?.startsWith("https://")
        ? { rel: "noopener noreferrer", target: "_blank" }
        : {})}
      {...props}
    />
  );
}

export const ARTICLE_COMPONENTS: MDXComponents = {
  a: ArticleLink,
  h2: Heading,
  img: ArticleImage,
  table: ({ children, ...props }) => (
    <div className="my-8 overflow-x-auto rounded-lg border">
      <table {...props}>{children}</table>
    </div>
  ),
};
