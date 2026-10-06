declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";
  import type { ComponentType } from "react";

  const content: ComponentType<MDXProps>;
  export default content;
}
