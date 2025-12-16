# Leave Tracker - AI Context

## Stack
Next.js 15 (App Router) • React 19 • TypeScript • Supabase (PostgreSQL) • Supabase Realtime • NextAuth v5 (JWT) • React Query • Tailwind • shadcn/ui • Jest • Playwright

## Critical: Realtime (NO Polling)
- Supabase subscriptions on `leave_requests`, `toil_entries`, `users`
- Hooks: `subscribeToUserLeaveRequests()`, `subscribeToAllLeaveRequests()`, `subscribeToPendingRequests()`
- Pattern: Subscribe → invalidate queries on change
- Migration: `003_enable_realtime.sql` (must be applied)

## Architecture
**Data**: React Query + Supabase listeners → query invalidation
**Auth**: NextAuth v5, middleware (`src/middleware.ts`), roles: USER/ADMIN
**API**: `/api/leave/*`, `/api/admin/*`, `/api/toil/*`
**Response**: `{success: bool, data?: any, error?: {message, statusCode?}}`

## Structure
```
src/app/          # Pages (App Router)
src/components/   # UI (shadcn/ui)
src/hooks/        # React Query + Realtime
src/lib/          # supabase.ts, realtime/, react-query.ts, env.ts, supabase-analytics.ts
src/auth.ts       # NextAuth config
supabase/         # seed.supabase.ts, migrations/
```

## Models
**User**: id, email, name, role, annual_leave_balance, toil_balance, sick_leave_balance
**LeaveRequest**: id, user_id, start_date, end_date, type, status, hours
**ToilEntry**: id, user_id, date, hours, type, approved

## Commands
`npm run dev` (dev) • `npm run dev:clean` (kill port + clean) • `npm run build` • `npm run typecheck` • `npm run db:seed` • `npm test` • `npm run test:e2e`

## Patterns

**Realtime Hook**:
```ts
useEffect(() => {
  const sub = subscribeToUserLeaveRequests(userId, () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all })
  );
  return () => sub.unsubscribe();
}, [userId, queryClient]);
```

**Query Keys**: `queryKeys.leaveRequests.byUser(userId, ...)` → invalidate with `queryKeys.admin.all`

## Guidelines
- NO polling (all realtime via Supabase)
- Always invalidate queries on mutations
- Toast: `sonner` library
- UI: `@/components/ui/*` (shadcn)
- Dates: `date-fns`
- Forms: `react-hook-form` + Zod
- Env vars: validated via Zod (`src/lib/env.ts`)

## Docs
`docs/architecture.md` • `docs/api-standards.md` • `REALTIME_SETUP.md` • `docs/prd.md`
