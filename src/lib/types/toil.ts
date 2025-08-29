// Policy-driven TOIL scenarios based on contract sections
export enum TOILScenario {
  LOCAL_SHOW = 'local_show',           // 6.6(a) - 0 hours
  WORKING_DAY_PANEL = 'working_day_panel', // 6.6(b) - 1pm next day
  OVERNIGHT_DAY_OFF = 'overnight_day_off', // 6.6(c) - 4 hours
  OVERNIGHT_WORKING_DAY = 'overnight_working_day' // 6.6(d) - Variable
}

export interface TOILRequest {
  scenario: TOILScenario;
  travelDate: Date;
  returnDate?: Date;    // Required for overnight scenarios
  returnTime?: string;  // Required for overnight_working_day
  coveringUserId?: string; // Required for working_day_panel
  reason: string;
  calculatedHours?: number;
}

// Map to existing backend enum
export const ScenarioToBackendType: Record<TOILScenario, string> = {
  [TOILScenario.LOCAL_SHOW]: 'LOCAL_SHOW',
  [TOILScenario.WORKING_DAY_PANEL]: 'AGENT_PANEL_DAY',
  [TOILScenario.OVERNIGHT_DAY_OFF]: 'WEEKEND_TRAVEL',
  [TOILScenario.OVERNIGHT_WORKING_DAY]: 'TRAVEL_LATE_RETURN'
};