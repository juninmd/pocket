import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
  message?: string;
}

const Mascot: React.FC<MascotProps> = ({ message = "Olá, amigo!" }) => {
  return (
    <div className="mascot-container">
      <motion.svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="mascot-svg"
        aria-label="Friendly Mascot"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        {/* Face */}
        <circle cx="50" cy="50" r="45" fill="#FFD700" stroke="#DAA520" strokeWidth="2" />
        {/* Left Eye */}
        <circle cx="35" cy="40" r="5" fill="#333" />
        {/* Right Eye */}
        <circle cx="65" cy="40" r="5" fill="#333" />
        {/* Mouth */}
        <path d="M 30 65 Q 50 80 70 65" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Cheeks */}
        <circle cx="25" cy="55" r="5" fill="#FF69B4" opacity="0.6" />
        <circle cx="75" cy="55" r="5" fill="#FF69B4" opacity="0.6" />
      </motion.svg>
      <motion.p
        className="mascot-message"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
    </div>
  );
};

export default Mascot;
