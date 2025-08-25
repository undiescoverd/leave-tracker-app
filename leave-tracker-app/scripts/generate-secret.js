#!/usr/bin/env node

const crypto = require('crypto');

// Generate a secure random secret
const secret = crypto.randomBytes(32).toString('base64');

console.log('🔐 Generated secure NEXTAUTH_SECRET:');
console.log('');
console.log(`NEXTAUTH_SECRET="${secret}"`);
console.log('');
console.log('📝 Copy this to your .env.local file');
console.log('⚠️  Keep this secret secure and never commit it to version control');
