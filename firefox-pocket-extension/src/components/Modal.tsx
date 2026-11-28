import React from 'react';
import { Dialog } from '@juninmd/sonido';
import '../styles/theme.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  type?: 'default' | 'danger' | 'success';
}

/**
 * Pocket's modal, rendered with Sonido's native-`<dialog>` Dialog.
 * The Dialog owns focus trapping, Escape and backdrop clicks; Pocket only
 * maps its `type` to the accent stripe and mounts it while open.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  type = 'default'
}) => {
  if (!isOpen) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={title ?? ''}
      footer={footer}
      className={`pocket-modal pocket-modal--${type}`}
    >
      {children}
    </Dialog>
  );
};
