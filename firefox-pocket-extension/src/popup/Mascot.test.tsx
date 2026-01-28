import React from 'react';
import { render, screen } from '@testing-library/react';
import Mascot from './Mascot';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        svg: ({ children, className, ...props }: any) => <svg className={className} {...props}>{children}</svg>,
        p: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
    },
}));

describe('Mascot', () => {
    it('should render with default message', () => {
        render(<Mascot />);
        expect(screen.getByText('Olá, amigo!')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
        render(<Mascot message="Hello World" />);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
});
