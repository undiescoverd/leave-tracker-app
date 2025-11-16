const { PrismaClient } = require('@prisma/client');

async function checkUser() {
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'sup@tdhagency.com' }
    });
    
    console.log('User data:');
    console.log(JSON.stringify(user, null, 2));
    
    if (user) {
      // Check for any problematic characters in the data
      console.log('\nChecking for special characters:');
      console.log('Name has quotes:', user.name?.includes('"') || user.name?.includes("'"));
      console.log('Email has quotes:', user.email?.includes('"') || user.email?.includes("'"));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();