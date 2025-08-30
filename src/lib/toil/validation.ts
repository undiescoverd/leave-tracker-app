import { z } from 'zod';
import { TOILScenario } from '@/lib/types/toil';

// Base schema - always required
const baseSchema = z.object({
  scenario: z.nativeEnum(TOILScenario),
  travelDate: z.date(),
  reason: z.string().min(10, 'Please provide details (min 10 characters)')
});

// Conditional schemas based on scenario
export const toilFormSchema = z.discriminatedUnion('scenario', [
  // Local Show - just base fields
  baseSchema.extend({
    scenario: z.literal(TOILScenario.LOCAL_SHOW)
  }),
  
  // Working Day + Panel - needs coverage
  baseSchema.extend({
    scenario: z.literal(TOILScenario.WORKING_DAY_PANEL),
    coveringUserId: z.string().min(1, 'Please select who will cover')
  }),
  
  // Overnight + Day Off - needs return date
  baseSchema.extend({
    scenario: z.literal(TOILScenario.OVERNIGHT_DAY_OFF),
    returnDate: z.date().refine(
      (val) => val != null,
      'Return date is required for overnight travel'
    )
  }),
  
  // Overnight + Working Day - needs return date and time
  baseSchema.extend({
    scenario: z.literal(TOILScenario.OVERNIGHT_WORKING_DAY),
    returnDate: z.date().refine(
      (val) => val != null,
      'Return date is required for overnight travel'
    ),
    returnTime: z.string().regex(
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter a valid time (HH:MM)'
    )
  })
]);

export type TOILFormData = z.infer<typeof toilFormSchema>;