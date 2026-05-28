"use client";

import React from "react";

export type ModalTone = "info" | "success" | "warning" | "destructive";

interface ModalProps {
  open: boolean;
  title?: string;
  tone?: ModalTone;
  message?: string;
  children?: React.ReactNode;
  onClose: () => void;
  /** When provided, renders a confirm + cancel pair instead of a single close button. */
  onConfirm?: () => void;
  confirmLabel?: string;
  closeLabel?: string;
  /** Disables the action buttons (e.g. while an async confirm is running). */
  busy?: boolean;
}

/**
 * Centered modal popup for confirmations and errors. Transient success messages
 * and tx-hash notifications use the corner toast (see Toast.tsx), not this modal.
 */
export function Modal({
  open,
  title,
  tone = "info",
  message,
  children,
  onClose,
  onConfirm,
  confirmLabel = "■ CONFIRM ■",
  closeLabel,
  busy = false,
}: ModalProps) {
  if (!open) return null;

  const resolvedCloseLabel = closeLabel ?? (onConfirm ? "■ CANCEL ■" : "■ CLOSE ■");

  return (
    <div
      className="bp-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={() => !busy && onClose()}
    >
      <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
        {title && (
          <h3 className="bp-modal-title" data-tone={tone}>
            {title}
          </h3>
        )}
        <div className="bp-card-copy">{message ?? children}</div>
        <div
          className="bp-flex bp-gap-sm bp-mt-lg"
          style={{ justifyContent: "flex-end", flexWrap: "wrap" }}
        >
          <button className="bp-btn" onClick={onClose} disabled={busy}>
            {resolvedCloseLabel}
          </button>
          {onConfirm && (
            <button className="bp-btn bp-btn-accent" onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
