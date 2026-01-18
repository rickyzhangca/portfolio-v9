import type { Icon } from "@phosphor-icons/react";

interface CanvasControlButtonProps {
  onClick: () => void;
  Icon: Icon;
  label: string;
  disabled?: boolean;
}

export const CanvasControlButton = ({
  onClick,
  Icon,
  label,
  disabled,
}: CanvasControlButtonProps) => {
  return (
    <button
      aria-label={label}
      className="rounded-full p-3 hover:bg-background3 active:bg-background4 disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={16} />
    </button>
  );
};
