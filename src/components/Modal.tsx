import type { ReactNode } from "react";

interface ModalProps {
  onClose?: () => void;
  children: ReactNode;
  width?: number;
  dismissOnBackdrop?: boolean;
}

export function Modal({
  onClose,
  children,
  width,
  dismissOnBackdrop = false,
}: ModalProps) {
  return (
    <div
      className="overlay"
      onClick={() => {
        if (dismissOnBackdrop) onClose?.();
      }}
    >
      <div className="modal" style={width ? { width } : undefined} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
