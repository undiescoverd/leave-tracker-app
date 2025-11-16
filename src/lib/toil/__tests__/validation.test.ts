import { toilFormSchema } from '../validation';
import { TOILScenario } from '@/lib/types/toil';

describe('TOIL Form Validation', () => {
  describe('Local Show scenario', () => {
    it('should validate with just basic fields', () => {
      const validData = {
        scenario: TOILScenario.LOCAL_SHOW,
        travelDate: new Date(),
        reason: 'Local theatre show'
      };
      
      const result = toilFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short reason', () => {
      const invalidData = {
        scenario: TOILScenario.LOCAL_SHOW,
        travelDate: new Date(),
        reason: 'Short'
      };
      
      const result = toilFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Working Day Panel scenario', () => {
    it('should require covering user ID', () => {
      const invalidData = {
        scenario: TOILScenario.WORKING_DAY_PANEL,
        travelDate: new Date(),
        reason: 'Agent panel meeting'
        // Missing coveringUserId
      };
      
      const result = toilFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate with covering user ID', () => {
      const validData = {
        scenario: TOILScenario.WORKING_DAY_PANEL,
        travelDate: new Date(),
        reason: 'Agent panel meeting',
        coveringUserId: 'user123'
      };
      
      const result = toilFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Overnight Day Off scenario', () => {
    it('should require return date', () => {
      const invalidData = {
        scenario: TOILScenario.OVERNIGHT_DAY_OFF,
        travelDate: new Date(),
        reason: 'Weekend client meeting'
        // Missing returnDate
      };
      
      const result = toilFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate with return date', () => {
      const validData = {
        scenario: TOILScenario.OVERNIGHT_DAY_OFF,
        travelDate: new Date(),
        returnDate: new Date(),
        reason: 'Weekend client meeting'
      };
      
      const result = toilFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Overnight Working Day scenario', () => {
    it('should require both return date and time', () => {
      const invalidData = {
        scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
        travelDate: new Date(),
        reason: 'Client meeting with late return'
        // Missing returnDate and returnTime
      };
      
      const result = toilFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate time format', () => {
      const invalidTimeData = {
        scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
        travelDate: new Date(),
        returnDate: new Date(),
        returnTime: '25:70', // Invalid time
        reason: 'Client meeting with late return'
      };
      
      const result = toilFormSchema.safeParse(invalidTimeData);
      expect(result.success).toBe(false);
    });

    it('should validate with proper return date and time', () => {
      const validData = {
        scenario: TOILScenario.OVERNIGHT_WORKING_DAY,
        travelDate: new Date(),
        returnDate: new Date(),
        returnTime: '21:30',
        reason: 'Client meeting with late return'
      };
      
      const result = toilFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});