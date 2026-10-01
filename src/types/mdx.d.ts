declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";
  import type { ComponentType, ReactNode } from "react";

  export const credit: ReactNode | undefined;
  const content: ComponentType<MDXProps>;
  export default content;
}
