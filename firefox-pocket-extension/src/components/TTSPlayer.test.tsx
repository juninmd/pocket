import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TTSPlayer } from './TTSPlayer';

describe('TTSPlayer', () => {
    const mockSpeak = jest.fn();
    const mockCancel = jest.fn();
    const mockResume = jest.fn();
    const mockPause = jest.fn();

    // Mock SpeechSynthesis
    beforeAll(() => {
        global.SpeechSynthesisUtterance = jest.fn() as any;
        Object.defineProperty(window, 'speechSynthesis', {
            value: {
                speak: mockSpeak,
                cancel: mockCancel,
                resume: mockResume,
                pause: mockPause,
            },
            writable: true
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render controls', () => {
        render(<TTSPlayer text="Hello" />);
        expect(screen.getByLabelText('Play')).toBeInTheDocument();
        expect(screen.getByLabelText('Stop')).toBeInTheDocument();
    });

    it('should start playing', () => {
        render(<TTSPlayer text="Hello" />);
        fireEvent.click(screen.getByLabelText('Play'));
        expect(mockSpeak).toHaveBeenCalled();
        expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });

    it('should pause', () => {
        render(<TTSPlayer text="Hello" />);
        fireEvent.click(screen.getByLabelText('Play')); // Start
        fireEvent.click(screen.getByLabelText('Pause')); // Pause
        expect(mockPause).toHaveBeenCalled();
        expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });

    it('should resume', () => {
        render(<TTSPlayer text="Hello" />);
        fireEvent.click(screen.getByLabelText('Play')); // Start
        fireEvent.click(screen.getByLabelText('Pause')); // Pause
        fireEvent.click(screen.getByLabelText('Play')); // Resume
        expect(mockResume).toHaveBeenCalled();
    });

    it('should stop', () => {
        render(<TTSPlayer text="Hello" />);
        fireEvent.click(screen.getByLabelText('Play'));
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(mockCancel).toHaveBeenCalled();
    });

    it('should change rate', () => {
        render(<TTSPlayer text="Hello" />);
        const rateBtn = screen.getByText('1x');
        fireEvent.click(rateBtn);
        expect(screen.getByText('1.5x')).toBeInTheDocument();
    });
});
