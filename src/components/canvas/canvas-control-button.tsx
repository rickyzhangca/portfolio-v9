import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

interface CanvasControlButtonProps {
  onClick?: () => void;
  Icon: PhosphorIcon;
  label: string;
  disabled?: boolean;
}

export const CanvasControlButton = ({
  onClick,
  Icon,
  label,
  disabled,
}: CanvasControlButtonProps) => (
  <button
    aria-label={label}
    className="rounded-full p-3 pointer-coarse:p-3.5 hover:bg-background3 active:bg-background4 disabled:pointer-events-none disabled:opacity-50"
    disabled={disabled}
    onClick={onClick}
    title={label}
    type="button"
  >
    <Icon size={16} />
  </button>
);
