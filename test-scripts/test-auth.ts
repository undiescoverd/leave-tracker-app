#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const TEST_PASSWORD = 'Password123!'

const testUsers = [
  {
    email: 'senay.taormina@tdhagency.com',
    name: 'Senay Taormina',
    role: 'ADMIN',
    expectedAccess: ['dashboard', 'admin']
  },
  {
    email: 'ian.vincent@tdhagency.com',
    name: 'Ian Vincent',
    role: 'ADMIN',
    expectedAccess: ['dashboard', 'admin']
  },
  {
    email: 'sup.dhanasunthorn@tdhagency.com',
    name: 'Sup Dhanasunthorn',
    role: 'USER',
    expectedAccess: ['dashboard']
  },
  {
    email: 'luis.drake@tdhagency.com',
    name: 'Luis Drake',
    role: 'USER',
    expectedAccess: ['dashboard']
  }
]

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL'
  message: string
  details?: any
}

const results: TestResult[] = []

function logResult(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} ${result.test}: ${result.message}`)
  if (result.details) {
    console.log(`   Details:`, result.details)
  }
  results.push(result)
}

async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    const userCount = await prisma.user.count()
    logResult({
      test: 'Database Connection',
      status: 'PASS',
      message: `Connected successfully. Found ${userCount} users.`
    })
    return true
  } catch (error) {
    logResult({
      test: 'Database Connection',
      status: 'FAIL',
      message: 'Failed to connect to database',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

async function testUserAuthentication() {
  console.log('\n🔐 Testing User Authentication...')
  
  for (const userData of testUsers) {
    try {
      // Test user exists in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (!user) {
        logResult({
          test: `User Exists - ${userData.name}`,
          status: 'FAIL',
          message: `User not found in database`
        })
        continue
      }
      
      logResult({
        test: `User Exists - ${userData.name}`,
        status: 'PASS',
        message: `Found user with role: ${user.role}`
      })
      
      // Test password authentication
      const isPasswordValid = await bcrypt.compare(TEST_PASSWORD, user.password)
      
      if (!isPasswordValid) {
        logResult({
          test: `Password Auth - ${userData.name}`,
          status: 'FAIL',
          message: `Password authentication failed`
        })
      } else {
        logResult({
          test: `Password Auth - ${userData.name}`,
          status: 'PASS',
          message: `Password authentication successful`
        })
      }
      
      // Test role assignment
      if (user.role !== userData.role) {
        logResult({
          test: `Role Assignment - ${userData.name}`,
          status: 'FAIL',
          message: `Expected role ${userData.role}, got ${user.role}`
        })
      } else {
        logResult({
          test: `Role Assignment - ${userData.name}`,
          status: 'PASS',
          message: `Role correctly assigned: ${user.role}`
        })
      }
      
    } catch (error) {
      logResult({
        test: `User Test - ${userData.name}`,
        status: 'FAIL',
        message: 'Error testing user',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

async function testApiEndpoints() {
  console.log('\n🌐 Testing API Endpoints...')
  
  try {
    // Test database connection endpoint
    const testResponse = await fetch(`${BASE_URL}/api/test`)
    const testData = await testResponse.json()
    
    if (testResponse.ok && testData.status === 'success') {
      logResult({
        test: 'API Test Endpoint',
        status: 'PASS',
        message: `Database connection via API successful. User count: ${testData.userCount}`
      })
    } else {
      logResult({
        test: 'API Test Endpoint',
        status: 'FAIL',
        message: 'API test endpoint failed',
        details: testData
      })
    }
  } catch (error) {
    logResult({
      test: 'API Test Endpoint',
      status: 'FAIL',
      message: 'Failed to reach API test endpoint',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function testRouteProtection() {
  console.log('\n🛡️ Testing Route Protection...')
  
  try {
    // Test that dashboard redirects to login when not authenticated
    const dashboardResponse = await fetch(`${BASE_URL}/dashboard`, {
      redirect: 'manual'
    })
    
    if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
      logResult({
        test: 'Dashboard Route Protection',
        status: 'PASS',
        message: 'Dashboard redirects unauthenticated users to login'
      })
    } else {
      logResult({
        test: 'Dashboard Route Protection',
        status: 'FAIL',
        message: `Dashboard should redirect, got status: ${dashboardResponse.status}`
      })
    }
  } catch (error) {
    logResult({
      test: 'Dashboard Route Protection',
      status: 'FAIL',
      message: 'Error testing dashboard route protection',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function printSummary() {
  console.log('\n📊 Test Summary')
  console.log('='.repeat(50))
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const total = results.length
  
  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`   - ${result.test}: ${result.message}`)
    })
  }
  
  console.log('\n🔑 Test Credentials:')
  testUsers.forEach(user => {
    console.log(`   ${user.name}: ${user.email} / ${TEST_PASSWORD}`)
  })
}

async function main() {
  console.log('🧪 Starting Authentication Tests...')
  console.log(`📍 Base URL: ${BASE_URL}`)
  console.log(`🔑 Test Password: ${TEST_PASSWORD}`)
  
  // Test database connection first
  const dbConnected = await testDatabaseConnection()
  if (!dbConnected) {
    console.log('\n❌ Cannot proceed with tests - database connection failed')
    process.exit(1)
  }
  
  // Run all tests
  await testUserAuthentication()
  await testApiEndpoints()
  await testRouteProtection()
  
  // Print summary
  printSummary()
  
  // Exit with appropriate code
  const failedTests = results.filter(r => r.status === 'FAIL').length
  process.exit(failedTests > 0 ? 1 : 0)
}

main()
  .catch((error) => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
