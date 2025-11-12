#!/usr/bin/env node

/**
 * Quick test script for production-ready email service
 */

// Test the environment validation logic
function testEnvironmentValidation() {
  console.log('🧪 Testing Environment Validation\n');

  // Test required production variables
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET', 
    'NEXTAUTH_URL',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'EMAIL_REPLY_TO'
  ];

  console.log('Required Environment Variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    console.log(`  ${status} ${varName}: ${value ? 'configured' : 'missing'}`);
  });

  // Check NEXTAUTH_SECRET length
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.length < 32) {
    console.log('  ⚠️  NEXTAUTH_SECRET should be 32+ characters');
  }

  // Check HTTPS
  const url = process.env.NEXTAUTH_URL;
  if (url && !url.startsWith('https://') && process.env.NODE_ENV === 'production') {
    console.log('  ⚠️  NEXTAUTH_URL should use HTTPS in production');
  }

  console.log('\n');
}

function testEmailConfiguration() {
  console.log('📧 Testing Email Configuration\n');

  const emailEnabled = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const hasFromEmail = !!process.env.EMAIL_FROM;

  console.log('Email Service Configuration:');
  console.log(`  📧 Notifications enabled: ${emailEnabled ? '✅' : '❌'}`);
  console.log(`  🔑 Resend API Key: ${hasApiKey ? '✅' : '❌'}`);
  console.log(`  📬 From email: ${hasFromEmail ? '✅' : '❌'}`);
  console.log(`  📮 Reply-to: ${process.env.EMAIL_REPLY_TO || 'not set'}`);

  // Test rate limiting config
  const rateLimit = parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '50');
  const retries = parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3');
  const timeout = parseInt(process.env.EMAIL_TIMEOUT_MS || '30000');

  console.log('\nEmail Service Limits:');
  console.log(`  📊 Rate limit: ${rateLimit}/hour`);
  console.log(`  🔄 Retry attempts: ${retries}`);
  console.log(`  ⏱️  Timeout: ${timeout}ms`);

  const isConfigured = emailEnabled && hasApiKey && hasFromEmail;
  console.log(`\n📋 Overall status: ${isConfigured ? '✅ Ready' : '❌ Needs configuration'}\n`);

  return isConfigured;
}

function testHealthEndpoints() {
  console.log('🏥 Health Endpoint Configuration\n');

  const hasHealthToken = !!process.env.HEALTH_CHECK_TOKEN;
  const metricsEnabled = process.env.METRICS_ENABLED === 'true';
  const logLevel = process.env.LOG_LEVEL || 'info';

  console.log('Monitoring Configuration:');
  console.log(`  🔒 Health check token: ${hasHealthToken ? '✅' : '⚠️  recommended'}`);
  console.log(`  📊 Metrics enabled: ${metricsEnabled ? '✅' : '❌'}`);
  console.log(`  📝 Log level: ${logLevel}`);

  console.log('\nAvailable endpoints:');
  console.log('  🏥 /api/health - Basic health check');
  console.log('  🔍 /api/health?level=detailed - Detailed health check');
  console.log('  📊 /api/metrics - System metrics (if enabled)');
  console.log('  ✅ /api/readiness - Production readiness check');
  
  console.log('');
}

function main() {
  console.log('🚀 Production Email Service Test\n');
  console.log('=================================\n');

  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Node Version: ${process.version}\n`);

  testEnvironmentValidation();
  const emailReady = testEmailConfiguration();
  testHealthEndpoints();

  console.log('📋 Summary:');
  if (emailReady) {
    console.log('✅ Email service is ready for production');
  } else {
    console.log('❌ Email service needs configuration');
    console.log('\n📝 Required steps:');
    console.log('1. Set ENABLE_EMAIL_NOTIFICATIONS=true');
    console.log('2. Configure RESEND_API_KEY with valid API key');
    console.log('3. Set EMAIL_FROM with your domain email');
    console.log('4. Set EMAIL_REPLY_TO for replies');
  }

  console.log('\n🔗 Next steps:');
  console.log('- Test endpoints: npm run health:check');
  console.log('- Run readiness check: npm run readiness:check'); 
  console.log('- Full production check: npm run prod:check');
}

if (require.main === module) {
  main();
}

module.exports = { testEnvironmentValidation, testEmailConfiguration };