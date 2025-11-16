/**
 * DESIGN REGISTRY: Motion System
 *
 * Standardized animation durations, easings, and transitions.
 * Creates consistent, performant animations across the application.
 *
 * @packageDocumentation
 */

/**
 * Motion system for animations and transitions
 */
export const motion = {
  /**
   * Animation durations
   */
  duration: {
    instant: 'duration-0',     // 0ms - No animation
    fast: 'duration-150',      // 150ms - Quick interactions
    normal: 'duration-200',    // 200ms - Default (most common)
    slow: 'duration-300',      // 300ms - Deliberate transitions
    slower: 'duration-500',    // 500ms - Emphasized animations
  },

  /**
   * Easing functions
   */
  easing: {
    linear: 'ease-linear',
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
  },

  /**
   * Common transitions (combine duration + easing)
   */
  transitions: {
    /** Default transition for most interactions */
    default: 'transition-all duration-200 ease-in-out',

    /** Card hover effects */
    card: 'transition-all duration-300 ease-in-out',

    /** Button interactions */
    button: 'transition-colors duration-200 ease-in-out',

    /** Modal/dialog entrance */
    modal: 'transition-opacity duration-200 ease-out',

    /** Dropdown/menu appearance */
    dropdown: 'transition-all duration-150 ease-out',

    /** Color changes (text, bg, border) */
    colors: 'transition-colors duration-200 ease-in-out',

    /** Transform changes (scale, translate) */
    transform: 'transition-transform duration-300 ease-in-out',

    /** Shadow changes */
    shadow: 'transition-shadow duration-300 ease-in-out',
  },

  /**
   * Animation presets (Tailwind animations)
   */
  animations: {
    /** Spin animation for loaders */
    spin: 'animate-spin',

    /** Pulse animation for loading states */
    pulse: 'animate-pulse',

    /** Bounce animation for attention */
    bounce: 'animate-bounce',

    /** Fade in animation */
    fadeIn: 'animate-fade-in',

    /** Fade out animation */
    fadeOut: 'animate-fade-out',

    /** Slide in from left */
    slideInLeft: 'animate-slide-in-left',

    /** Slide in from right */
    slideInRight: 'animate-slide-in-right',

    /** Scale in animation */
    scaleIn: 'animate-scale-in',

    /** Float animation (gentle up/down) */
    float: 'animate-float',
  },
} as const;

/**
 * Type exports
 */
export type Motion = typeof motion;
export type Duration = typeof motion.duration;
export type Transitions = typeof motion.transitions;
export type Animations = typeof motion.animations;
