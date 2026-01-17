import type { Icon } from "@phosphor-icons/react";

interface CanvasControlButtonProps {
  onClick: () => void;
  Icon: Icon;
  disabled?: boolean;
}

export const CanvasControlButton = ({
  onClick,
  Icon,
  disabled,
}: CanvasControlButtonProps) => {
  return (
    <button
      className="rounded-full p-3 hover:bg-background3 active:bg-background4 disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon size={16} />
    </button>
  );
};
