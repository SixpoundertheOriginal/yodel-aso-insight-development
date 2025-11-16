/**
 * DESIGN REGISTRY: Formatter Unit Tests
 *
 * Comprehensive test coverage for all number, percentage, and date formatters.
 * Target: 100% code coverage
 */

import { describe, it, expect } from 'vitest';
import { formatters } from '../tokens/formatters';

describe('formatters.number.compact', () => {
  it('formats millions correctly', () => {
    expect(formatters.number.compact(2500000, 1)).toBe('2.5M');
    expect(formatters.number.compact(1000000, 1)).toBe('1.0M');
    expect(formatters.number.compact(15750000, 1)).toBe('15.8M');
  });

  it('formats thousands correctly', () => {
    expect(formatters.number.compact(5000, 1)).toBe('5.0K');
    expect(formatters.number.compact(1500, 1)).toBe('1.5K');
    expect(formatters.number.compact(999999, 1)).toBe('1000.0K');
  });

  it('formats small numbers correctly', () => {
    expect(formatters.number.compact(500, 1)).toBe('500');
    expect(formatters.number.compact(99, 1)).toBe('99');
    expect(formatters.number.compact(0, 1)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatters.number.compact(-5000, 1)).toBe('-5.0K');
    expect(formatters.number.compact(-2500000, 1)).toBe('-2.5M');
    expect(formatters.number.compact(-500, 1)).toBe('-500');
  });

  it('respects decimal places', () => {
    expect(formatters.number.compact(2500000, 2)).toBe('2.50M');
    expect(formatters.number.compact(1550000, 2)).toBe('1.55M');
    expect(formatters.number.compact(5500, 0)).toBe('6K');
  });

  it('handles edge cases', () => {
    expect(formatters.number.compact(0, 1)).toBe('0');
    expect(formatters.number.compact(NaN, 1)).toBe('0');
    expect(formatters.number.compact(Infinity, 1)).toBe('0');
    expect(formatters.number.compact(-Infinity, 1)).toBe('0');
  });
});

describe('formatters.number.full', () => {
  it('formats with thousands separators', () => {
    expect(formatters.number.full(1234567)).toBe('1,234,567');
    expect(formatters.number.full(1000)).toBe('1,000');
    expect(formatters.number.full(500)).toBe('500');
  });

  it('handles decimals', () => {
    expect(formatters.number.full(1234.567)).toBe('1,235');
    expect(formatters.number.full(1234.123)).toBe('1,234');
  });

  it('handles edge cases', () => {
    expect(formatters.number.full(0)).toBe('0');
    expect(formatters.number.full(NaN)).toBe('0');
    expect(formatters.number.full(Infinity)).toBe('0');
  });
});

describe('formatters.number.precise', () => {
  it('formats with exact decimals', () => {
    expect(formatters.number.precise(0.12345, 2)).toBe('0.12');
    expect(formatters.number.precise(1234.567, 3)).toBe('1,234.567');
    expect(formatters.number.precise(5, 2)).toBe('5.00');
  });

  it('handles zero', () => {
    expect(formatters.number.precise(0, 2)).toBe('0.00');
  });

  it('handles edge cases', () => {
    expect(formatters.number.precise(NaN, 2)).toBe('0.00');
    expect(formatters.number.precise(Infinity, 2)).toBe('0.00');
  });
});

describe('formatters.percentage.standard', () => {
  it('formats percentages correctly', () => {
    expect(formatters.percentage.standard(12.5, 1)).toBe('12.5%');
    expect(formatters.percentage.standard(100, 1)).toBe('100.0%');
    expect(formatters.percentage.standard(0, 1)).toBe('0.0%');
  });

  it('respects decimal places', () => {
    expect(formatters.percentage.standard(12.567, 2)).toBe('12.57%');
    expect(formatters.percentage.standard(12.5, 0)).toBe('13%');
  });

  it('handles edge cases', () => {
    expect(formatters.percentage.standard(NaN, 1)).toBe('0.0%');
    expect(formatters.percentage.standard(Infinity, 1)).toBe('0.0%');
  });
});

describe('formatters.percentage.delta', () => {
  it('adds plus sign for positive values', () => {
    expect(formatters.percentage.delta(5.2, 1)).toBe('+5.2%');
    expect(formatters.percentage.delta(0.1, 1)).toBe('+0.1%');
  });

  it('keeps minus sign for negative values', () => {
    expect(formatters.percentage.delta(-3.1, 1)).toBe('-3.1%');
    expect(formatters.percentage.delta(-0.5, 1)).toBe('-0.5%');
  });

  it('handles zero correctly', () => {
    expect(formatters.percentage.delta(0, 1)).toBe('+0.0%');
  });

  it('respects decimal places', () => {
    expect(formatters.percentage.delta(5.267, 2)).toBe('+5.27%');
    expect(formatters.percentage.delta(-3.189, 2)).toBe('-3.19%');
  });

  it('handles edge cases', () => {
    expect(formatters.percentage.delta(NaN, 1)).toBe('0.0%');
    expect(formatters.percentage.delta(Infinity, 1)).toBe('0.0%');
  });
});

describe('formatters.percentage.points', () => {
  it('formats percentage points correctly', () => {
    expect(formatters.percentage.points(5.2, 1)).toBe('5.2pp');
    expect(formatters.percentage.points(-3.1, 1)).toBe('-3.1pp');
  });

  it('respects decimal places', () => {
    expect(formatters.percentage.points(5.267, 2)).toBe('5.27pp');
  });

  it('handles edge cases', () => {
    expect(formatters.percentage.points(NaN, 1)).toBe('0.0pp');
    expect(formatters.percentage.points(Infinity, 1)).toBe('0.0pp');
  });
});

describe('formatters.ratio', () => {
  it('formats ratios correctly', () => {
    expect(formatters.ratio(2.5, 1)).toBe('2.5:1');
    expect(formatters.ratio(0.5, 1)).toBe('0.5:1');
    expect(formatters.ratio(10, 1)).toBe('10.0:1');
  });

  it('returns infinity symbol for very large values', () => {
    expect(formatters.ratio(1000, 1)).toBe('∞');
    expect(formatters.ratio(999999, 1)).toBe('∞');
  });

  it('respects decimal places', () => {
    expect(formatters.ratio(2.567, 2)).toBe('2.57:1');
  });

  it('handles edge cases', () => {
    expect(formatters.ratio(NaN, 1)).toBe('0.0:1');
    expect(formatters.ratio(Infinity, 1)).toBe('0.0:1');
  });
});

describe('formatters.currency', () => {
  it('formats currency correctly', () => {
    expect(formatters.currency(1234.56)).toBe('$1,235');
    expect(formatters.currency(1000000)).toBe('$1,000,000');
    expect(formatters.currency(0)).toBe('$0');
  });

  it('handles negative values', () => {
    expect(formatters.currency(-500)).toBe('-$500');
  });

  it('rounds to nearest dollar', () => {
    expect(formatters.currency(1234.99)).toBe('$1,235');
    expect(formatters.currency(1234.01)).toBe('$1,234');
  });

  it('handles edge cases', () => {
    expect(formatters.currency(NaN)).toBe('$0');
    expect(formatters.currency(Infinity)).toBe('$0');
  });
});

describe('formatters.date.short', () => {
  it('formats short dates correctly', () => {
    expect(formatters.date.short('2024-01-15')).toBe('Jan 15');
    expect(formatters.date.short('2024-12-31')).toBe('Dec 31');
  });

  it('handles Date objects', () => {
    const date = new Date('2024-01-15');
    expect(formatters.date.short(date)).toBe('Jan 15');
  });

  it('handles invalid dates', () => {
    expect(formatters.date.short('invalid')).toBe('');
    expect(formatters.date.short('')).toBe('');
  });
});

describe('formatters.date.medium', () => {
  it('formats medium dates correctly', () => {
    expect(formatters.date.medium('2024-01-15')).toBe('Jan 15, 2024');
    expect(formatters.date.medium('2024-12-31')).toBe('Dec 31, 2024');
  });

  it('handles Date objects', () => {
    const date = new Date('2024-01-15');
    expect(formatters.date.medium(date)).toBe('Jan 15, 2024');
  });

  it('handles invalid dates', () => {
    expect(formatters.date.medium('invalid')).toBe('');
  });
});

describe('formatters.date.long', () => {
  it('formats long dates correctly', () => {
    expect(formatters.date.long('2024-01-15')).toBe('January 15, 2024');
    expect(formatters.date.long('2024-12-31')).toBe('December 31, 2024');
  });

  it('handles Date objects', () => {
    const date = new Date('2024-01-15');
    expect(formatters.date.long(date)).toBe('January 15, 2024');
  });

  it('handles invalid dates', () => {
    expect(formatters.date.long('invalid')).toBe('');
  });
});

// Integration tests - ensure consistency across formatters
describe('formatters integration', () => {
  it('maintains consistency across number formatters', () => {
    const value = 1500000;

    expect(formatters.number.compact(value)).toBe('1.5M');
    expect(formatters.number.full(value)).toBe('1,500,000');
    expect(formatters.number.precise(value, 2)).toBe('1,500,000.00');
  });

  it('maintains consistency across percentage formatters', () => {
    const value = 5.2;

    expect(formatters.percentage.standard(value)).toBe('5.2%');
    expect(formatters.percentage.delta(value)).toBe('+5.2%');
    expect(formatters.percentage.points(value)).toBe('5.2pp');
  });
});
