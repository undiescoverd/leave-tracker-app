#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve('.env.local') });

async function resetPasswords() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  try {
    console.log('🔧 Resetting user passwords to known values...');

    // Define users and their new passwords
    const userUpdates = [
      { email: 'senay@tdhagency.com', password: 'password123' },
      { email: 'ian@tdhagency.com', password: 'password123' },
      { email: 'sup@tdhagency.com', password: 'password123' },
      { email: 'luis@tdhagency.com', password: 'password123' },
      { email: 'test@example.com', password: 'test123' },
    ];

    for (const userData of userUpdates) {
      console.log(`\n🔑 Updating password for ${userData.email}...`);

      // Check if user exists
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .single();

      if (findError || !user) {
        console.log(`⚠️  User ${userData.email} not found, skipping...`);
        continue;
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Update the user's password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('email', userData.email);

      if (updateError) {
        console.error(`❌ Error updating ${userData.email}:`, updateError);
        continue;
      }

      console.log(`✅ Password updated for ${userData.email}`);
      console.log(`   New password: ${userData.password}`);

      // Test the new password immediately
      const isValid = await bcrypt.compare(userData.password, hashedPassword);
      console.log(`   Password validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }

    console.log('\n🎉 Password reset complete!');
    console.log('\n📝 Login credentials:');
    console.log('   Admin users:');
    console.log('   - senay@tdhagency.com / password123');
    console.log('   - ian@tdhagency.com / password123');
    console.log('   Regular users:');
    console.log('   - sup@tdhagency.com / password123');
    console.log('   - luis@tdhagency.com / password123');
    console.log('   - test@example.com / test123');

  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  }
}

resetPasswords();
