import type { Icon } from "@phosphor-icons/react";

interface CanvasControlButtonProps {
  onClick: () => void;
  Icon: Icon;
}

export const CanvasControlButton = ({
  onClick,
  Icon,
}: CanvasControlButtonProps) => {
  return (
    <button
      className="rounded-full p-3 hover:bg-background3 active:bg-background4"
      onClick={onClick}
      type="button"
    >
      <Icon size={16} />
    </button>
  );
};
