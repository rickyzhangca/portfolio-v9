import type { IconWeight, Icon as PhosphorIcon } from "@phosphor-icons/react";

interface CanvasControlButtonProps {
  onClick?: () => void;
  Icon: PhosphorIcon;
  label: string;
  disabled?: boolean;
  /** Set for toggle buttons; announced as aria-pressed. */
  pressed?: boolean;
}

export const CanvasControlButton = ({
  onClick,
  Icon,
  label,
  disabled,
  pressed,
}: CanvasControlButtonProps) => {
  const weight: IconWeight = pressed ? "fill" : "regular";
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className="rounded-full p-3 pointer-coarse:p-3.5 hover:bg-background3 active:bg-background4 disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={16} weight={weight} />
    </button>
  );
};
