import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReadingProgressBar } from './ReadingProgressBar';

describe('ReadingProgressBar', () => {
    const setScroll = (scrollY: number, scrollHeight: number, innerHeight: number) => {
        Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true });
        Object.defineProperty(document.documentElement, 'scrollHeight', {
            value: scrollHeight,
            configurable: true,
        });
        Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
    };

    afterEach(() => {
        setScroll(0, 0, 768);
    });

    it('should render an accessible progress bar', () => {
        setScroll(0, 2000, 1000);
        render(<ReadingProgressBar />);
        expect(screen.getByRole('progressbar', { name: 'Progresso de leitura' })).toBeInTheDocument();
    });

    it('should follow the scroll position', () => {
        setScroll(0, 2000, 1000);
        render(<ReadingProgressBar />);
        const bar = screen.getByRole('progressbar', { name: 'Progresso de leitura' });
        expect(bar).toHaveAttribute('aria-valuenow', '0');

        setScroll(500, 2000, 1000);
        act(() => {
            fireEvent.scroll(window);
        });
        expect(bar).toHaveAttribute('aria-valuenow', '50');

        setScroll(1000, 2000, 1000);
        act(() => {
            fireEvent.scroll(window);
        });
        expect(bar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should stay at zero when the page has nothing to scroll', () => {
        setScroll(0, 1000, 1000);
        render(<ReadingProgressBar />);
        expect(screen.getByRole('progressbar', { name: 'Progresso de leitura' })).toHaveAttribute('aria-valuenow', '0');
    });
});
