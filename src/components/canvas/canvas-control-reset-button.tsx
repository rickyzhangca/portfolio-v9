interface CanvasControlResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CanvasControlResetButton = ({
  onClick,
  disabled,
}: CanvasControlResetButtonProps) => (
  <button
    className="bg-background3 hover:bg-background4 active:bg-background5 disabled:text-foreground2 w-full rounded-lg px-3 py-2 text-sm disabled:pointer-events-none"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    Reset
  </button>
);
