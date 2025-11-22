/**
 * TACTICAL EFFECTS TOKENS
 *
 * Batman Arkham Knight-inspired tactical intelligence aesthetic.
 * Professional command center UI elements with orange/black Yodel branding.
 */

export const tacticalEffects = {
  // Tactical L-shaped corner brackets
  cornerBracket: {
    topLeft: 'absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2',
    topRight: 'absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2',
    bottomLeft: 'absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2',
    bottomRight: 'absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2',
    colors: {
      orange: 'border-orange-500/60',
      emerald: 'border-emerald-400/60',
      yellow: 'border-yellow-400/60',
      red: 'border-red-400/60',
      blue: 'border-blue-400/60',
      purple: 'border-purple-400/60',
    },
    animated: 'animate-bracket-pulse',
  },
  
  // Holographic orange glow (not neon - subtle and professional)
  holoGlow: {
    subtle: '0 0 20px rgba(249, 115, 22, 0.15), inset 0 0 20px rgba(249, 115, 22, 0.05)',
    moderate: '0 0 30px rgba(249, 115, 22, 0.25), inset 0 0 30px rgba(249, 115, 22, 0.08)',
    strong: '0 0 40px rgba(249, 115, 22, 0.35), inset 0 0 40px rgba(249, 115, 22, 0.12)',
    score: {
      emerald: '0 0 30px rgba(16, 185, 129, 0.25), inset 0 0 20px rgba(16, 185, 129, 0.1)',
      yellow: '0 0 30px rgba(251, 191, 36, 0.25), inset 0 0 20px rgba(251, 191, 36, 0.1)',
      red: '0 0 30px rgba(239, 68, 68, 0.25), inset 0 0 20px rgba(239, 68, 68, 0.1)',
    },
  },
  
  // Transparent glass panels with backdrop blur
  glassPanel: {
    light: 'bg-black/40 backdrop-blur-md border border-zinc-800/60',
    medium: 'bg-black/60 backdrop-blur-lg border border-zinc-700/70',
    heavy: 'bg-black/80 backdrop-blur-xl border border-zinc-600/80',
  },
  
  // Segmented tactical borders (dashed style)
  segmentedBorder: {
    top: 'border-t-2 border-dashed border-orange-500/40',
    right: 'border-r-2 border-dashed border-orange-500/40',
    bottom: 'border-b-2 border-dashed border-orange-500/40',
    left: 'border-l-2 border-dashed border-orange-500/40',
    full: 'border-2 border-dashed border-orange-500/40',
  },
  
  // Subtle grid overlay (not scanlines)
  gridOverlay: {
    pattern: 'radial-gradient(circle at 1px 1px, rgba(249, 115, 22, 0.08) 1px, transparent 0)',
    size: '24px 24px',
    className: 'bg-[radial-gradient(circle_at_1px_1px,rgba(249,115,22,0.08)_1px,transparent_0)] bg-[length:24px_24px]',
  },
  
  // Hexagonal shapes for badges and frames
  hexagon: {
    badge: 'clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    frame: 'clip-path: polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)',
  },
  
  // Orbital rings for score displays (rotating)
  orbitalRing: {
    outer: 'absolute inset-0 rounded-full border-2 border-orange-500/20 animate-slow-spin',
    middle: 'absolute inset-2 rounded-full border border-orange-500/30 animate-reverse-spin',
    inner: 'absolute inset-4 rounded-full border border-orange-500/10',
  },
  
  // Clipped corners (45° angles for tactical style)
  clippedCorner: {
    topRight: 'clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
    bottomLeft: 'clip-path: polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
    both: 'clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
  },
  
  // Data stream effect (animated vertical bars)
  dataStream: 'linear-gradient(0deg, transparent 0%, rgba(249, 115, 22, 0.1) 50%, transparent 100%)',
  
  // Transitions
  transitions: {
    smooth: 'transition-all duration-300 ease-out',
    fast: 'transition-all duration-200 ease-out',
    bracket: 'transition-opacity duration-300 ease-out',
  },
  
  // Hover effects (tactical style)
  hover: {
    panel: 'hover:bg-zinc-800/50 hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    bracket: 'hover:opacity-100 hover:scale-105',
    glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]',
  },
} as const;

export type TacticalEffects = typeof tacticalEffects;
