import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'Password123!'

const users = [
  {
    email: 'senay.taormina@tdhagency.com',
    name: 'Senay Taormina',
    role: 'ADMIN' as const
  },
  {
    email: 'ian.vincent@tdhagency.com',
    name: 'Ian Vincent',
    role: 'ADMIN' as const
  },
  {
    email: 'sup.dhanasunthorn@tdhagency.com',
    name: 'Sup Dhanasunthorn',
    role: 'USER' as const
  },
  {
    email: 'luis.drake@tdhagency.com',
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
  
  // Count total users
  const userCount = await prisma.user.count()
  console.log(`\n📊 Database seeding complete! Total users: ${userCount}`)
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
