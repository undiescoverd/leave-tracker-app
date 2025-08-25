# Leave Tracker App Setup Guide

## Step 1: Configure Database Connection

1. **Get your database connection string from Vercel:**
   - Go to your Vercel dashboard
   - Navigate to your project → Storage → leave-tracker-db
   - Go to Settings tab
   - Copy the connection string

2. **Create .env.local file:**
   ```bash
   cd leave-tracker-app
   touch .env.local
   ```

3. **Add your environment variables to .env.local:**
   ```env
   # Database Configuration (Vercel Postgres)
   DATABASE_URL="your-actual-connection-string-from-vercel"

   # NextAuth Configuration
   NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
   NEXTAUTH_URL="http://localhost:3000"

   # Development environment
   NODE_ENV="development"
   ```

## Step 2: Run Database Migration

```bash
cd leave-tracker-app
npx prisma migrate dev --name init
```

## Step 3: Generate Prisma Client

```bash
npx prisma generate
```

## Step 4: Test Your Setup

```bash
npm run dev
```

Then visit: http://localhost:3000/api/test

## Step 5: Verify Success

You should see a JSON response like:
```json
{
  "status": "success",
  "message": "Database connection successful",
  "userCount": 0,
  "timestamp": "2025-08-23T..."
}
```

## Next Steps

Once this is working, we'll move to Story 1.2: User Authentication & Registration.
