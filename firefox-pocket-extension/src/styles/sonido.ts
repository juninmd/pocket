import './sonido.css';

/**
 * Sonido theme applied to `<html data-theme>`. `glass` is the design system's
 * dark surface theme; sonido.css bridges its tokens to Pocket's own palette.
 */
export const SONIDO_THEME = 'glass';

// Set before render so the first paint already uses the bridged tokens.
document.documentElement.dataset.theme = SONIDO_THEME;
