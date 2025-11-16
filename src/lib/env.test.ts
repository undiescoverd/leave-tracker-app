import { describe, it, expect } from '@jest/globals';
import { env, envValidation } from './env';

describe('Environment configuration', () => {
  it('exposes a NODE_ENV value', () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
  });

  it('provides sensible defaults for optional values', () => {
    expect(env.NEXTAUTH_URL).toMatch(/^https?:\/\//);
    expect(typeof env.EMAIL_TIMEOUT_MS).toBe('number');
  });

  it('shares validation metadata', () => {
    expect(envValidation.validationPassed).toBe(true);
    expect(typeof envValidation.hasDatabase).toBe('boolean');
  });
});
