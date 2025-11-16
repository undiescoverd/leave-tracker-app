import { describe, it, expect } from '@jest/globals';
import { calculateWorkingDays } from '@/lib/date-utils';

describe('calculateWorkingDays helper', () => {
  it('counts only weekdays between two dates (inclusive)', () => {
    const start = new Date('2024-12-23'); // Monday
    const end = new Date('2024-12-27'); // Friday

    expect(calculateWorkingDays(start, end)).toBe(5);
  });

  it('ignores weekends even inside the range', () => {
    const start = new Date('2024-12-21'); // Saturday
    const end = new Date('2024-12-29'); // Sunday

    expect(calculateWorkingDays(start, end)).toBe(5);
  });

  it('handles single-day ranges', () => {
    const monday = new Date('2024-12-23');
    const saturday = new Date('2024-12-21');

    expect(calculateWorkingDays(monday, monday)).toBe(1);
    expect(calculateWorkingDays(saturday, saturday)).toBe(0);
  });
});
