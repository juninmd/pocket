import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/theme.css';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** aria-modal promises the page behind is inert: Tab/Shift+Tab wrap inside the dialog instead of leaking out. */
const trapTab = (e: KeyboardEvent, dialog: HTMLElement | null) => {
  if (!dialog) return;
  const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const outside = !dialog.contains(active);
  if (e.shiftKey && (active === first || active === dialog || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || outside)) {
    e.preventDefault();
    first.focus();
  }
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  type?: 'default' | 'danger' | 'success';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  type = 'default'
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape closes; focus moves into the dialog and returns to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onCloseRef.current();
      if (e.key === 'Tab') trapTab(e, dialogRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`glass-panel modal-dialog modal-${type}`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h3 id="modal-title" className="modal-title">{title}</h3>}
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
