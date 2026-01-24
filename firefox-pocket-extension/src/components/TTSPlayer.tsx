import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TTSPlayerProps {
    text: string;
}

export const TTSPlayer: React.FC<TTSPlayerProps> = ({ text }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [rate, setRate] = useState(1);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handlePlay = () => {
        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        if (isPlaying) {
            window.speechSynthesis.pause();
            setIsPaused(true);
            setIsPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR'; // Detect or default to PT-BR
        utterance.rate = rate;

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
    };

    const changeRate = () => {
        const newRate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
        setRate(newRate);

        // If playing, we need to restart to apply rate (browser limitation usually)
        // Or valid implementations might allow dynamic update, but restart is safer
        if (isPlaying || isPaused) {
            window.speechSynthesis.cancel();
            // Small timeout to allow cancel to process
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'pt-BR';
                utterance.rate = newRate;
                utterance.onend = () => {
                    setIsPlaying(false);
                    setIsPaused(false);
                };
                utteranceRef.current = utterance;
                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
                setIsPaused(false);
            }, 50);
        }
    };

    return (
        <div className="tts-player" style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(15, 17, 21, 0.9)', // Glass-ish
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-light)',
            padding: '10px 16px',
            borderRadius: '50px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 100
        }}>
            <button onClick={handlePlay} aria-label={isPlaying ? "Pause" : "Play"} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: 'var(--primary)', display: 'flex' }}>
                {isPlaying ? '⏸️' : '▶️'}
            </button>

            <button onClick={handleStop} aria-label="Stop" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: 'var(--text-secondary)', display: 'flex' }}>
                ⏹️
            </button>

            <button onClick={changeRate} style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-main)',
                padding: '4px 8px',
                borderRadius: '12px',
                fontWeight: 'bold',
                minWidth: '35px'
            }}>
                {rate}x
            </button>
        </div>
    );
};
