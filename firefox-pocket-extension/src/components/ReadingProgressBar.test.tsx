import React from 'react';
import { render } from '@testing-library/react';
import { ReadingProgressBar } from './ReadingProgressBar';

jest.mock('framer-motion', () => ({
    useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
    useSpring: () => ({ get: () => 0 }),
    motion: {
        div: ({ style }: any) => <div data-testid="progress-bar" style={style} />
    }
}));

describe('ReadingProgressBar', () => {
    it('should render', () => {
        const { getByTestId } = render(<ReadingProgressBar />);
        expect(getByTestId('progress-bar')).toBeInTheDocument();
    });
});
