import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const DEFAULT_PASSWORD = 'Password123!';

const users = [
  {
    email: 'senay@tdhagency.com',
    name: 'Senay Taormina',
    role: 'OWNER' as const  // Business owner - no leave balance shown
  },
  {
    email: 'ian@tdhagency.com',
    name: 'Ian Vincent',
    role: 'TECH_ADMIN' as const  // Technical admin - no leave balance shown
  },
  {
    email: 'sup@tdhagency.com',
    name: 'Sup Dhanasunthorn',
    role: 'USER' as const
  },
  {
    email: 'luis@tdhagency.com',
    name: 'Luis Drake',
    role: 'USER' as const
  }
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash the default password
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // Create/update users
  const createdUserIds: string[] = [];

  for (const userData of users) {
    try {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      let user;
      if (existingUser) {
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            name: userData.name,
            role: userData.role,
            password: hashedPassword,
            updated_at: new Date().toISOString(),
          })
          .eq('email', userData.email)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }
        user = updatedUser;
        console.log(`✅ Updated user: ${user.name} (${user.email}) - Role: ${user.role}`);
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: userData.email,
            name: userData.name,
            role: userData.role,
            password: hashedPassword,
            annual_leave_balance: 32,
            toil_balance: 0,
            sick_leave_balance: 3,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }
        user = newUser;
        console.log(`✅ Created user: ${user.name} (${user.email}) - Role: ${user.role}`);
      }

      createdUserIds.push(user.id);
    } catch (error) {
      console.error(`❌ Error creating/updating user ${userData.email}:`, error);
    }
  }

  // Fetch all created users for leave request creation
  const { data: allUsers, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .in('id', createdUserIds);

  if (fetchError || !allUsers || allUsers.length === 0) {
    console.error('❌ Error fetching created users:', fetchError);
    return;
  }

  // Create sample leave requests
  const sampleLeaveRequests = [
    {
      user_id: allUsers[0].id,
      start_date: new Date('2025-09-15').toISOString(),
      end_date: new Date('2025-09-20').toISOString(),
      type: 'ANNUAL' as const,
      status: 'PENDING' as const,
      comments: 'Family vacation',
      reason: 'Family vacation'
    },
    {
      user_id: allUsers[1].id,
      start_date: new Date('2025-09-10').toISOString(),
      end_date: new Date('2025-09-12').toISOString(),
      type: 'SICK' as const,
      status: 'APPROVED' as const,
      comments: 'Medical appointment',
      reason: 'Medical appointment',
      approved_by: 'Senay Taormina',
      approved_at: new Date().toISOString()
    },
    {
      user_id: allUsers[2].id,
      start_date: new Date('2025-10-01').toISOString(),
      end_date: new Date('2025-10-05').toISOString(),
      type: 'ANNUAL' as const,
      status: 'PENDING' as const,
      comments: 'Personal time off',
      reason: 'Personal time off'
    },
    {
      user_id: allUsers[3].id,
      start_date: new Date('2025-08-25').toISOString(),
      end_date: new Date('2025-08-30').toISOString(),
      type: 'TOIL' as const,
      status: 'APPROVED' as const,
      comments: 'Time off in lieu for overtime',
      reason: 'Time off in lieu for overtime',
      approved_by: 'Ian Vincent',
      approved_at: new Date().toISOString()
    }
  ];

  for (const leaveData of sampleLeaveRequests) {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert(leaveData);

      if (error) {
        throw error;
      }

      const userName = allUsers.find(u => u.id === leaveData.user_id)?.name;
      console.log(`✅ Created leave request for ${userName}`);
    } catch (error) {
      console.error(`❌ Error creating leave request:`, error);
    }
  }

  // Count total users and leave requests
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: leaveRequestCount } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Database seeding complete! Total users: ${userCount}, Leave requests: ${leaveRequestCount}`);
  console.log(`🔑 Default password for all users: ${DEFAULT_PASSWORD}`);
  console.log('\n👥 Seeded users:');
  users.forEach(user => {
    console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n✨ Seeding process finished');
  });
