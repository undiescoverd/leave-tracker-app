# TDH Agency Leave Tracker

This is a [Next.js](https://nextjs.org) project for managing employee leave requests at TDH Agency.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Environment Setup

1. **Generate a secure secret:**
   ```bash
   npm run generate-secret
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure your environment variables in `.env.local`:**
   ```env
   # Database Configuration (Vercel Postgres)
   DATABASE_URL="your-postgresql-connection-string"
   
   # NextAuth Configuration (use the generated secret)
   NEXTAUTH_SECRET="your-generated-secret"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Development environment
   NODE_ENV="development"
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Set up the database:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Seed the database with test users (optional):**
   ```bash
   npm run db:seed
   ```

8. **Run authentication tests (optional):**
   ```bash
   npm run test:auth
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing & Development

### Database Seeding
The application includes a seeding script that creates test users for development:

```bash
npm run db:seed
```

This creates the following users:
- **Senay Taormina** (Admin) - senay.taormina@tdhagency.com
- **Ian Vincent** (Admin) - ian.vincent@tdhagency.com  
- **Sup Dhanasunthorn** (User) - sup.dhanasunthorn@tdhagency.com
- **Luis Drake** (User) - luis.drake@tdhagency.com

**Default password for all users**: `Password123!`

### Authentication Testing
Run comprehensive authentication tests:

```bash
npm run test:auth
```

This tests:
- Database connection
- User authentication
- Role-based access control
- API endpoints
- Route protection

### Complete Setup & Test
Run both seeding and testing in sequence:

```bash
npm run test:setup
```

## 🔧 Troubleshooting

### Database Issues
If you encounter database migration or enum type issues:

```bash
# Reset database and apply schema
npx prisma db push --force-reset

# Generate Prisma client
npx prisma generate

# Seed the database
npm run db:seed
```

### Common Issues
- **"type Role does not exist"**: Run `npx prisma db push --force-reset`
- **Migration conflicts**: Remove migrations folder and use `db push` instead
- **Connection issues**: Verify your `DATABASE_URL` in `.env.local`

## 🔐 Security Features

- **Route Protection**: Middleware automatically protects all routes except public ones
- **Role-Based Access**: Admin routes are protected and require ADMIN role
- **Environment Validation**: All required environment variables are validated at startup
- **Secure Secrets**: Automatic secret generation with proper entropy

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── lib/                 # Utility libraries (auth, prisma, env)
├── middleware.ts        # Route protection middleware
└── types/              # TypeScript type definitions
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
