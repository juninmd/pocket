import React, { useEffect, useState } from 'react';
import { ProgressBar } from '@juninmd/sonido';

/** Reading progress for the reader, rendered with Sonido's ProgressBar. */
export const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="reading-progress">
      <ProgressBar value={progress} label="Progresso de leitura" size="sm" tone="accent" />
    </div>
  );
};
