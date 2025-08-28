/**
 * Feature flags for gradual TOIL rollout
 * Can be disabled instantly if issues arise
 */

interface Features {
  TOIL_ENABLED: boolean;
  TOIL_REQUEST_ENABLED: boolean;
  TOIL_ADMIN_ENABLED: boolean;
  SICK_LEAVE_ENABLED: boolean;
  getFeature(key: keyof Features): boolean;
  isMultiLeaveTypeEnabled(): boolean;
  getAvailableLeaveTypes(): string[];
}

export const features: Features = {
  // Master switch for all TOIL features
  TOIL_ENABLED: process.env.NEXT_PUBLIC_TOIL_ENABLED === 'true',
  
  // Granular control
  TOIL_REQUEST_ENABLED: process.env.NEXT_PUBLIC_TOIL_REQUEST === 'true',
  TOIL_ADMIN_ENABLED: process.env.NEXT_PUBLIC_TOIL_ADMIN === 'true',
  SICK_LEAVE_ENABLED: process.env.NEXT_PUBLIC_SICK_LEAVE === 'true',
  
  // Default to false for safety
  getFeature(key: keyof Features): boolean {
    if (key === 'getFeature' || key === 'isMultiLeaveTypeEnabled' || key === 'getAvailableLeaveTypes') {
      return false;
    }
    return features[key] ?? false;
  },

  // Helper to check if using new leave types
  isMultiLeaveTypeEnabled(): boolean {
    return features.TOIL_ENABLED || features.SICK_LEAVE_ENABLED;
  },

  // Helper to get available leave types based on features
  getAvailableLeaveTypes(): string[] {
    const types = ['ANNUAL'];
    
    if (features.TOIL_ENABLED) {
      types.push('TOIL');
    }
    
    if (features.SICK_LEAVE_ENABLED) {
      types.push('SICK');
    }
    
    return types;
  }
};

// Helper to check if user can request specific leave type
export const canRequestLeaveType = (type: string) => {
  switch (type) {
    case 'ANNUAL':
      return true; // Always available
    case 'TOIL':
      return features.TOIL_ENABLED;
    case 'SICK':
      return features.SICK_LEAVE_ENABLED;
    default:
      return false;
  }
};
