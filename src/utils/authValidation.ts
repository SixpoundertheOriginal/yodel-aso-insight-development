/**
 * Password validation utilities for authentication flows
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-5 scale
  issues: string[];
  suggestions: string[];
}

/**
 * Validates password strength and returns detailed feedback
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!password) {
    return {
      isValid: false,
      score: 0,
      issues: ['Password is required'],
      suggestions: ['Please enter a password']
    };
  }

  // Length check
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters');
    suggestions.push('Add more characters to reach minimum length');
  } else {
    score += 1;
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
    suggestions.push('Add an uppercase letter (A-Z)');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    suggestions.push('Consider adding lowercase letters for better security');
  } else {
    score += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    issues.push('Password must contain at least one number');
    suggestions.push('Add a number (0-9)');
  } else {
    score += 1;
  }

  // Special character check (optional but recommended)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    suggestions.push('Consider adding special characters for stronger security');
  } else {
    score += 1;
  }

  // Additional length bonus
  if (password.length >= 12) {
    score += 1;
  }

  const isValid = issues.length === 0;

  return {
    isValid,
    score,
    issues,
    suggestions
  };
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitizes input to prevent basic XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .trim(); // Remove leading/trailing whitespace
};

/**
 * Generates password strength color class for UI
 */
export const getPasswordStrengthColor = (score: number): string => {
  if (score >= 4) return 'text-green-500';
  if (score >= 3) return 'text-yellow-500';
  if (score >= 2) return 'text-orange-500';
  return 'text-red-500';
};

/**
 * Gets password strength label
 */
export const getPasswordStrengthLabel = (score: number): string => {
  if (score >= 5) return 'Very Strong';
  if (score >= 4) return 'Strong';
  if (score >= 3) return 'Good';
  if (score >= 2) return 'Fair';
  if (score >= 1) return 'Weak';
  return 'Very Weak';
};