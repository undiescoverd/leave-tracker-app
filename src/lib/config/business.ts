/**
 * Business configuration that can be overridden by environment variables
 */

// Leave allowance configuration
export const LEAVE_CONFIG = {
  ANNUAL_LEAVE_ALLOWANCE: parseInt(process.env.ANNUAL_LEAVE_ALLOWANCE || '32'),
  SICK_LEAVE_ALLOWANCE: parseInt(process.env.SICK_LEAVE_ALLOWANCE || '10'),
  TOIL_HOURS_ALLOWANCE: parseInt(process.env.TOIL_HOURS_ALLOWANCE || '40'),
};

// UK agent configuration for coverage requirements
export const UK_AGENTS = {
  EMAILS: process.env.UK_AGENT_EMAILS 
    ? process.env.UK_AGENT_EMAILS.split(',').map(email => email.trim())
    : ['sup@tdhagency.com', 'luis@tdhagency.com'],
  REQUIRE_COVERAGE: process.env.UK_REQUIRE_COVERAGE !== 'false', // Default true
};

// General business rules
export const BUSINESS_RULES = {
  MAX_LEAVE_REQUEST_DAYS_AHEAD: parseInt(process.env.MAX_LEAVE_REQUEST_DAYS_AHEAD || '365'),
  MIN_LEAVE_REQUEST_DAYS_AHEAD: parseInt(process.env.MIN_LEAVE_REQUEST_DAYS_AHEAD || '0'),
  ALLOW_WEEKEND_LEAVE_REQUESTS: process.env.ALLOW_WEEKEND_LEAVE_REQUESTS === 'true',
  MAX_CONSECUTIVE_LEAVE_DAYS: parseInt(process.env.MAX_CONSECUTIVE_LEAVE_DAYS || '21'),
};

// Validation
const validateConfig = () => {
  const errors: string[] = [];
  
  if (LEAVE_CONFIG.ANNUAL_LEAVE_ALLOWANCE <= 0) {
    errors.push('ANNUAL_LEAVE_ALLOWANCE must be greater than 0');
  }
  
  if (UK_AGENTS.EMAILS.length === 0) {
    errors.push('UK_AGENT_EMAILS cannot be empty if UK_REQUIRE_COVERAGE is enabled');
  }
  
  if (errors.length > 0) {
    console.warn('Business configuration warnings:', errors);
  }
};

validateConfig();