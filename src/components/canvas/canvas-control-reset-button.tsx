interface CanvasControlResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CanvasControlResetButton = ({
  onClick,
  disabled,
}: CanvasControlResetButtonProps) => {
  return (
    <button
      className="w-full rounded-lg bg-background3 px-3 py-2 text-sm hover:bg-background4 active:bg-background5 disabled:pointer-events-none disabled:text-foreground2"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      Reset
    </button>
  );
};
