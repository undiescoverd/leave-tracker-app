import { TOIL_SCENARIOS } from '../scenarios';
import { ScenarioToBackendType, TOILScenario } from '@/lib/types/toil';

describe('TOIL Scenarios', () => {
  it('should have all scenarios defined', () => {
    expect(Object.keys(TOIL_SCENARIOS)).toHaveLength(4);
    expect(TOIL_SCENARIOS[TOILScenario.LOCAL_SHOW]).toBeDefined();
    expect(TOIL_SCENARIOS[TOILScenario.WORKING_DAY_PANEL]).toBeDefined();
    expect(TOIL_SCENARIOS[TOILScenario.OVERNIGHT_DAY_OFF]).toBeDefined();
    expect(TOIL_SCENARIOS[TOILScenario.OVERNIGHT_WORKING_DAY]).toBeDefined();
  });
  
  it('should map correctly to backend types', () => {
    expect(ScenarioToBackendType[TOILScenario.LOCAL_SHOW]).toBe('LOCAL_SHOW');
    expect(ScenarioToBackendType[TOILScenario.WORKING_DAY_PANEL]).toBe('AGENT_PANEL_DAY');
    expect(ScenarioToBackendType[TOILScenario.OVERNIGHT_DAY_OFF]).toBe('WEEKEND_TRAVEL');
    expect(ScenarioToBackendType[TOILScenario.OVERNIGHT_WORKING_DAY]).toBe('TRAVEL_LATE_RETURN');
  });

  it('should have help text for all scenarios', () => {
    Object.values(TOIL_SCENARIOS).forEach(scenario => {
      expect(scenario.helpText).toBeTruthy();
    });
  });
  });

  it('should have labels and descriptions for all scenarios', () => {
    Object.values(TOIL_SCENARIOS).forEach(scenario => {
      expect(scenario.label).toBeTruthy();
      expect(scenario.description).toBeTruthy();
      expect(scenario.helpText).toBeTruthy();
    });
  });
});