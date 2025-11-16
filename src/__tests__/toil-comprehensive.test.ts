import { describe, it, expect } from '@jest/globals';
import { calculateTOILHours, getTOILDisplayText } from '@/lib/toil/calculator';
import { validateTOILRequest } from '@/lib/toil/validation';
import { TOILScenario, TOILRequest } from '@/lib/types/toil';

const buildRequest = (overrides: Partial<TOILRequest> = {}): TOILRequest => ({
  scenario: TOILScenario.LOCAL_SHOW,
  travelDate: new Date('2024-06-01'),
  reason: 'Detailed justification for TOIL request',
  ...overrides,
});

describe('TOIL calculations', () => {
  it('returns 0 hours for local shows', () => {
    const request = buildRequest({ scenario: TOILScenario.LOCAL_SHOW });

    expect(calculateTOILHours(request)).toBe(0);
    expect(getTOILDisplayText(0, request.scenario)).toBe('No TOIL will be allocated');
  });

  it('awards 4 hours for working day panels', () => {
    const request = buildRequest({
      scenario: TOILScenario.WORKING_DAY_PANEL,
      coveringUserId: 'cover-123',
    });

    expect(calculateTOILHours(request)).toBe(4);
    expect(getTOILDisplayText(4, request.scenario)).toContain('1pm');
  });

  it('derives hours from return time for overnight working days', () => {
    const lateReturn = buildRequest({
      scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
      returnDate: new Date('2024-06-02'),
      returnTime: '22:15',
    });

    const earlyReturn = { ...lateReturn, returnTime: '18:30' };

    expect(calculateTOILHours(lateReturn)).toBe(4);
    expect(calculateTOILHours(earlyReturn as TOILRequest)).toBe(0);
  });
});

describe('TOIL validation', () => {
  it('accepts valid overnight requests with return time', () => {
    const validRequest = buildRequest({
      scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
      returnDate: new Date('2024-06-02'),
      returnTime: '21:00',
    });

    expect(() => validateTOILRequest(validRequest)).not.toThrow();
  });

  it('rejects requests with short reason text', () => {
    const invalidRequest = buildRequest({ reason: 'too short' });

    expect(() => validateTOILRequest(invalidRequest)).toThrow('Please provide details (min 10 characters)');
  });

  it('requires return date/time for overnight travel', () => {
    const requestMissingReturn = buildRequest({
      scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
      returnDate: undefined,
      returnTime: undefined,
    });

    expect(() => validateTOILRequest(requestMissingReturn)).toThrow();
  });
});
