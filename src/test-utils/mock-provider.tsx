import { Provider } from "jotai";
import type { ReactNode } from "react";

export const MockProvider = ({ children }: { children: ReactNode }) => {
  return <Provider>{children}</Provider>;
};
