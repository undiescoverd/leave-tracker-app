import { calculateTOILHours } from '../calculator';
import { TOILScenario } from '@/lib/types/toil';

describe('TOIL Calculator', () => {
  describe('Local Show', () => {
    it('should return 0 hours', () => {
      const result = calculateTOILHours({
        scenario: TOILScenario.LOCAL_SHOW,
        travelDate: new Date(),
        reason: 'Local theatre'
      });
      expect(result).toBe(0);
    });
  });

  describe('Working Day Panel', () => {
    it('should return 4 hours for panel day', () => {
      const result = calculateTOILHours({
        scenario: TOILScenario.WORKING_DAY_PANEL,
        travelDate: new Date(),
        reason: 'Agent panel meeting'
      });
      expect(result).toBe(4);
    });
  });

  describe('Overnight Day Off', () => {
    it('should return 4 hours for weekend travel', () => {
      const result = calculateTOILHours({
        scenario: TOILScenario.OVERNIGHT_DAY_OFF,
        travelDate: new Date(),
        returnDate: new Date(),
        reason: 'Weekend client meeting'
      });
      expect(result).toBe(4);
    });
  });

  describe('Late Return', () => {
    it.each([
      ['18:30', 0],  // Before 7pm
      ['19:00', 1],  // 7pm
      ['20:00', 2],  // 8pm
      ['21:00', 3],  // 9pm
      ['22:00', 4],  // 10pm
      ['23:30', 4],  // After 10pm
    ])('should return %i hours for %s arrival', (time, expected) => {
      const result = calculateTOILHours({
        scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
        travelDate: new Date(),
        returnDate: new Date(),
        returnTime: time,
        reason: 'Client meeting'
      });
      expect(result).toBe(expected);
    });
  });

  describe('Edge cases', () => {
    it('should return null for missing scenario', () => {
      const result = calculateTOILHours({
        scenario: undefined as any,
        travelDate: new Date(),
        reason: 'Test'
      });
      expect(result).toBeNull();
    });

    it('should return null for missing travel date', () => {
      const result = calculateTOILHours({
        scenario: TOILScenario.LOCAL_SHOW,
        travelDate: undefined as any,
        reason: 'Test'
      });
      expect(result).toBeNull();
    });

    it('should return null for overnight working day without return time', () => {
      const result = calculateTOILHours({
        scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
        travelDate: new Date(),
        returnDate: new Date(),
        reason: 'Test'
        // Missing returnTime
      });
      expect(result).toBeNull();
    });
  });
});