# Project Structure

## Root Level
- `package.json` - Dependencies and scripts
- `prisma/schema.prisma` - Database schema with User, LeaveRequest, ToilEntry models
- `tailwind.config.js` - Tailwind configuration with custom theme
- `tsconfig.json` - TypeScript configuration with strict mode
- `eslint.config.mjs` - ESLint configuration
- `jest.config.js` - Jest testing configuration

## Source Structure (`src/`)

### App Router (`src/app/`)
- **Pages:** login, dashboard, admin, leave/requests, forgot-password, reset-password
- **API Routes:** Organized by feature (auth, leave, admin, users, calendar)
- **Layout:** Root layout with theme provider and Inter font

### Components (`src/components/`)
- **UI Components:** shadcn/ui components with smart variants (success, warning, error, info)
- **Feature Components:** LeaveRequestForm, MultiTypeBalanceDisplay, TeamCalendar
- **Layout Components:** Navigation, AuthenticatedLayout, ErrorBoundary

### Library (`src/lib/`)
- **Services:** leave.service.ts, toil.service.ts, leave-balance.service.ts
- **Utils:** auth.ts, prisma.ts, utils.ts, date-utils.ts, theme-utils.ts
- **API:** response.ts, errors.ts, validation.ts
- **Config:** env.ts, business.ts, features.ts

### Key Patterns
- **Authentication:** NextAuth.js with role-based access
- **Database:** Prisma ORM with PostgreSQL
- **Validation:** Zod schemas for all API inputs
- **Styling:** Tailwind with custom theme and smart status colors
- **Error Handling:** Standardized API responses and error boundaries