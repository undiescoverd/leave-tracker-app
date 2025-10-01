import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'Password123!'

const users = [
  {
    email: 'senay@tdhagency.com',
    name: 'Senay Taormina',
    role: 'ADMIN' as const
  },
  {
    email: 'ian@tdhagency.com',
    name: 'Ian Vincent',
    role: 'ADMIN' as const
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
]

async function main() {
  console.log('🌱 Starting database seeding...')
  
  // Hash the default password
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12)
  
  // Create users
  for (const userData of users) {
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          role: userData.role,
          password: hashedPassword
        },
        create: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          password: hashedPassword
        }
      })
      
      console.log(`✅ Created/Updated user: ${user.name} (${user.email}) - Role: ${user.role}`)
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error)
    }
  }
  
  // Create sample leave requests
  const createdUsers = await prisma.user.findMany()
  const sampleLeaveRequests = [
    {
      userId: createdUsers[0].id,
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-09-20'),
      type: 'ANNUAL' as const,
      status: 'PENDING' as const,
      comments: 'Family vacation'
    },
    {
      userId: createdUsers[1].id,
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-09-12'),
      type: 'SICK' as const,
      status: 'APPROVED' as const,
      comments: 'Medical appointment',
      approvedBy: 'Senay Taormina',
      approvedAt: new Date()
    },
    {
      userId: createdUsers[2].id,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-05'),
      type: 'ANNUAL' as const,
      status: 'PENDING' as const,
      comments: 'Personal time off'
    },
    {
      userId: createdUsers[3].id,
      startDate: new Date('2025-08-25'),
      endDate: new Date('2025-08-30'),
      type: 'TOIL' as const,
      status: 'APPROVED' as const,
      comments: 'Time off in lieu for overtime',
      approvedBy: 'Ian Vincent',
      approvedAt: new Date()
    }
  ]

  for (const leaveData of sampleLeaveRequests) {
    try {
      await prisma.leaveRequest.create({
        data: leaveData
      })
      console.log(`✅ Created leave request for ${createdUsers.find(u => u.id === leaveData.userId)?.name}`)
    } catch (error) {
      console.error(`❌ Error creating leave request:`, error)
    }
  }

  // Count total users and leave requests
  const userCount = await prisma.user.count()
  const leaveRequestCount = await prisma.leaveRequest.count()
  console.log(`\n📊 Database seeding complete! Total users: ${userCount}, Leave requests: ${leaveRequestCount}`)
  console.log(`🔑 Default password for all users: ${DEFAULT_PASSWORD}`)
  console.log('\n👥 Seeded users:')
  users.forEach(user => {
    console.log(`   - ${user.name} (${user.email}) - ${user.role}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
