import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
    const onClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not render when not open', () => {
        render(<Modal isOpen={false} onClose={onClose}>Content</Modal>);
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should render content when open', () => {
        render(<Modal isOpen={true} onClose={onClose} title="Title">Content</Modal>);
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('should open the native dialog as a modal', () => {
        const { container } = render(<Modal isOpen={true} onClose={onClose} title="T">Content</Modal>);
        expect(container.querySelector('dialog')).toHaveAttribute('open');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should call onClose when clicking the close button', () => {
        render(<Modal isOpen={true} onClose={onClose}>Content</Modal>);
        fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when the dialog is cancelled (Escape)', () => {
        const close = jest.fn();
        const { container } = render(<Modal isOpen={true} onClose={close} title="T">Content</Modal>);
        const dialog = container.querySelector('dialog') as HTMLDialogElement;
        // The browser turns Escape into a cancel event on the open dialog.
        fireEvent(dialog, new Event('cancel', { cancelable: true }));
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('should render footer', () => {
        render(<Modal isOpen={true} onClose={onClose} footer={<button>Ok</button>}>Content</Modal>);
        expect(screen.getByText('Ok')).toBeInTheDocument();
    });

    it('should mark danger and success modals', () => {
        const { container, rerender } = render(
            <Modal isOpen={true} onClose={onClose} type="danger">Content</Modal>
        );
        expect(container.querySelector('dialog')).toHaveClass('pocket-modal--danger');

        rerender(<Modal isOpen={true} onClose={onClose} type="success">Content</Modal>);
        expect(container.querySelector('dialog')).toHaveClass('pocket-modal--success');
    });
});
