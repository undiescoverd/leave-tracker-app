import { TOILScenario, TOILRequest } from '@/lib/types/toil';

/**
 * Pure function to calculate TOIL hours based on contract rules
 * Contract reference: Section 6.6(a-d)
 */
export function calculateTOILHours(request: TOILRequest): number | null {
  // Validate required fields
  if (!request.scenario || !request.travelDate) {
    return null;
  }

  switch (request.scenario) {
    case TOILScenario.LOCAL_SHOW:
      // Section 6.6(a): No TOIL for local shows
      return 0;

    case TOILScenario.WORKING_DAY_PANEL:
      // Section 6.6(b): 1pm start next day (equivalent to 4 hours)
      return 4;

    case TOILScenario.OVERNIGHT_DAY_OFF:
      // Section 6.6(c): Fixed 4 hours for weekend travel
      return 4;

    case TOILScenario.OVERNIGHT_WORKING_DAY:
      // Section 6.6(d): Based on return time
      if (!request.returnTime) return null;
      
      const hour = parseInt(request.returnTime.split(':')[0]);
      
      if (hour < 19) return 0;        // Before 7pm: No TOIL
      if (hour === 19) return 1;      // 7pm: 1 hour
      if (hour === 20) return 2;      // 8pm: 2 hours
      if (hour === 21) return 3;      // 9pm: 3 hours
      return 4;                        // 10pm+: 1pm start (4 hours)

    default:
      return null;
  }
}

/**
 * Get display text for TOIL calculation result
 */
export function getTOILDisplayText(hours: number | null, scenario: TOILScenario): string {
  if (hours === null) {
    return 'Calculating...';
  }

  if (hours === 0) {
    return 'No TOIL will be allocated';
  }

  // Special case for panel day
  if (scenario === TOILScenario.WORKING_DAY_PANEL && hours === 4) {
    return 'You will be able to start at 1pm on the following day';
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} of TOIL will be allocated`;
}