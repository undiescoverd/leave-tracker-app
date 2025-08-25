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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
