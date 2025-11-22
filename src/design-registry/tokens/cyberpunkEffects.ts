/**
 * CYBERPUNK EFFECTS TOKENS
 *
 * Visual enhancement tokens for cyberpunk aesthetic.
 * Includes glows, overlays, animations, and corner accents.
 */

export const cyberpunkEffects = {
  // Glow effects (box-shadow values)
  glow: {
    orange: {
      subtle: '0 0 10px rgba(249, 115, 22, 0.3)',
      moderate: '0 0 15px rgba(249, 115, 22, 0.4)',
      strong: '0 0 20px rgba(249, 115, 22, 0.6)',
      intense: '0 0 30px rgba(249, 115, 22, 0.8), 0 0 50px rgba(249, 115, 22, 0.4)',
    },
    emerald: {
      subtle: '0 0 10px rgba(16, 185, 129, 0.3)',
      moderate: '0 0 15px rgba(16, 185, 129, 0.4)',
      strong: '0 0 20px rgba(16, 185, 129, 0.6)',
    },
    blue: {
      subtle: '0 0 10px rgba(59, 130, 246, 0.3)',
      moderate: '0 0 15px rgba(59, 130, 246, 0.4)',
      strong: '0 0 20px rgba(59, 130, 246, 0.6)',
    },
    purple: {
      subtle: '0 0 10px rgba(168, 85, 247, 0.3)',
      moderate: '0 0 15px rgba(168, 85, 247, 0.4)',
      strong: '0 0 20px rgba(168, 85, 247, 0.6)',
    },
    yellow: {
      moderate: '0 0 15px rgba(251, 191, 36, 0.4)',
      strong: '0 0 20px rgba(251, 191, 36, 0.6)',
    },
    red: {
      moderate: '0 0 15px rgba(239, 68, 68, 0.4)',
      strong: '0 0 20px rgba(239, 68, 68, 0.6)',
    },
  },
  
  // Text shadows for neon effect
  textGlow: {
    emerald: '0 0 10px rgba(52, 211, 153, 0.5)',
    yellow: '0 0 10px rgba(251, 191, 36, 0.5)',
    red: '0 0 10px rgba(239, 68, 68, 0.5)',
    orange: '0 0 10px rgba(251, 146, 60, 0.5)',
    blue: '0 0 8px rgba(59, 130, 246, 0.6)',
    purple: '0 0 10px rgba(168, 85, 247, 0.5)',
  },
  
  // Background overlays (CSS variable references)
  overlay: {
    scanline: 'var(--scanline-overlay)',
    grid: 'var(--grid-overlay)',
    hologram: 'var(--hologram-overlay)',
  },
  
  // Corner accents (Tailwind classes)
  cornerAccent: {
    topLeft: 'absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg',
    topRight: 'absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg',
    bottomLeft: 'absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg',
    bottomRight: 'absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg',
    colors: {
      emerald: 'border-emerald-400/50',
      orange: 'border-orange-400/50',
      blue: 'border-blue-400/50',
      purple: 'border-purple-400/50',
      yellow: 'border-yellow-400/50',
    },
  },
  
  // Animations (Tailwind animation class names)
  animations: {
    cyberPulse: 'animate-cyber-pulse',
    badgeGlow: 'animate-badge-glow',
    scanlineMove: 'animate-scanline-move',
    hologramShift: 'animate-hologram-shift',
    dataStream: 'animate-data-stream',
    borderGlowRotate: 'animate-border-glow-rotate',
    counterUp: 'animate-counter-up',
    slideInLeft: 'animate-slide-in-left',
    fadeIn: 'animate-fade-in',
  },
  
  // Transition classes
  transitions: {
    smooth: 'transition-all duration-300',
    fast: 'transition-all duration-200',
    scale: 'transition-transform duration-300',
    border: 'transition-all duration-300',
  },
  
  // Hover effects (combined classes)
  hover: {
    scale: 'hover:scale-105',
    scaleSubtle: 'hover:scale-110',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
  },
} as const;

export type CyberpunkEffects = typeof cyberpunkEffects;
