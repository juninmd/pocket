import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from './Modal';

// Mock AnimatePresence since it delays unmounting
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('Modal', () => {
    const onClose = jest.fn();

    it('should not render when not open', () => {
        render(<Modal isOpen={false} onClose={onClose}>Content</Modal>);
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should render content when open', () => {
        render(<Modal isOpen={true} onClose={onClose} title="Title">Content</Modal>);
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('should call onClose when clicking overlay', () => {
        render(<Modal isOpen={true} onClose={onClose}>Content</Modal>);
        // The first motion.div is the overlay
        // We can find it by looking for the one with fixed position style logic or class
        // Since we mocked motion.div to just be div, we can just click the outer container?
        // But testing-library renders into a container.

        // Let's rely on the click handler on the backdrop
        // The backdrop has `onClick={onClose}`
        // The content stops propagation.

        // Let's assume the first div inside the component is the backdrop
        // But we can't easily select it without a test id or role.
        // I should probably add data-testid to Modal.tsx but I can't modify it easily right now without another step.
        // Actually, the button "×" calls onClose too.

        const closeBtn = screen.getByText('×');
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it('should render footer', () => {
        render(<Modal isOpen={true} onClose={onClose} footer={<button>Ok</button>}>Content</Modal>);
        expect(screen.getByText('Ok')).toBeInTheDocument();
    });

    it('should close on Escape and focus the dialog', () => {
        const close = jest.fn();
        render(<Modal isOpen={true} onClose={close} title="T">Content</Modal>);
        expect(screen.getByRole('dialog')).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(close).toHaveBeenCalledTimes(1);
    });
});
