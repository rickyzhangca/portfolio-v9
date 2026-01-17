import { Canvas } from "@/components/canvas/canvas";
import { portfolioGroups } from "@/data/portfolio-groups";

export const App = () => {
  return <Canvas initialGroups={portfolioGroups} />;
};
