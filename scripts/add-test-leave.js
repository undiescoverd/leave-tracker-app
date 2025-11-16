const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestLeave() {
  try {
    // Get the first user
    const user = await prisma.user.findFirst({
      where: { email: 'senay@tdhagency.com' }
    });
    
    if (!user) {
      console.error('User not found');
      return;
    }
    
    // Create a test leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        startDate: new Date('2025-09-02'),
        endDate: new Date('2025-09-03'),
        status: 'PENDING',
        comments: 'Test calendar display',
        type: 'ANNUAL',
        userId: user.id
      }
    });
    
    console.log('Created test leave request:', leaveRequest);
    
    // Create another one for a different date
    const leaveRequest2 = await prisma.leaveRequest.create({
      data: {
        startDate: new Date('2025-09-05'),
        endDate: new Date('2025-09-05'),
        status: 'APPROVED',
        comments: 'Another test leave',
        type: 'SICK',
        userId: user.id
      }
    });
    
    console.log('Created second test leave request:', leaveRequest2);
    
  } catch (error) {
    console.error('Error creating test leave:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestLeave();