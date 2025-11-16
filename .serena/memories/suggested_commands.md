# Suggested Commands

## Development Commands
- `npm run dev` - Start development server (port 3000)
- `npm run dev:clean` - Clean start (kills port, removes .next)
- `npm run dev:force` - Force start on port 3000
- `npm run build` - Build production version
- `npm run start` - Start production server

## Database Commands
- `npx prisma migrate dev` - Apply database migrations
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema to database
- `npm run db:seed` - Seed database with test users

## Testing Commands
- `npm run test:auth` - Test authentication system
- `npm run test:api` - Test API endpoints
- `npm run test:leave` - Test leave CRUD operations
- `npm run test:setup` - Run seeding + auth tests
- `npm run test:unit` - Run Jest unit tests
- `jest` - Run all Jest tests

## Code Quality
- `npm run lint` - Run ESLint
- `npm run fix:types` - TypeScript type checking (tsc --noEmit)

## Utility Commands
- `npm run generate-secret` - Generate NextAuth secret
- `npm run clean` - Remove .next, node_modules
- `npm run clean:install` - Clean + reinstall dependencies
- `npm run kill:port` - Kill processes on port 3000

## Debugging & Troubleshooting
- `npm run diagnose` - Run API diagnostics
- `npm run fix:server` - Fix server issues
- `npm run fix:500` - Fix 500 errors (clean .next)

## System Commands (macOS/Darwin)
- `ps aux | grep node` - Find Node processes
- `lsof -ti:3000` - Find process on port 3000
- `kill -9 $(lsof -ti:3000)` - Kill port 3000 processes