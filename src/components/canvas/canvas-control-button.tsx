import type { Icon } from "@phosphor-icons/react";
import { tw } from "@/lib/utils";

interface CanvasControlButtonProps {
  onClick?: () => void;
  Icon: Icon;
  label: string;
  disabled?: boolean;
  className?: string;
}

export const CanvasControlButton = ({
  onClick,
  Icon,
  label,
  disabled,
  className,
}: CanvasControlButtonProps) => {
  return (
    <button
      aria-label={label}
      className={tw(
        "rounded-full p-3 hover:bg-background3 active:bg-background4 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={16} />
    </button>
  );
};
