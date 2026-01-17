import { Canvas } from "@/components/canvas/canvas";
import { data } from "@/data/data";

export const App = () => {
  return <Canvas initialGroups={data} />;
};
