# Environment Setup Instructions

## Create .env.local file in the project root

Create a file named `.env.local` in your project root directory with the following content:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/leave_tracker"

# NextAuth Configuration
NEXTAUTH_SECRET="your-secret-key-change-this-in-production-make-it-long-and-random"
NEXTAUTH_URL="http://localhost:3000"

# Feature Flags - TOIL System
NEXT_PUBLIC_TOIL_ENABLED=true
NEXT_PUBLIC_TOIL_REQUEST=true
NEXT_PUBLIC_TOIL_ADMIN=false

# Other Feature Flags
NEXT_PUBLIC_SICK_LEAVE=false

# Development Settings
NODE_ENV=development
```

## Important Notes:

1. **DATABASE_URL**: Update with your actual PostgreSQL connection string
2. **NEXTAUTH_SECRET**: Generate a secure random secret (minimum 32 characters)
3. **TOIL Feature Flags**: 
   - `TOIL_ENABLED=true` enables backend TOIL support
   - `TOIL_REQUEST=true` enables the UI we just built
   - `TOIL_ADMIN=false` keeps admin features disabled initially

## Quick Fix for the Current Error:

The NextAuth ClientFetchError occurs because `NEXTAUTH_SECRET` is missing. After creating the .env.local file:

1. Restart your development server: `npm run dev`
2. The authentication should work properly

## Generate NEXTAUTH_SECRET:

You can generate a secure secret using:
```bash
openssl rand -base64 32
```

Or use this online generator: https://generate-secret.vercel.app/32