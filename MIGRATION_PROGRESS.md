# Supabase Migration Progress

## Overview
This document tracks the progress of migrating from Prisma ORM to Supabase.

**Migration Start Date**: 2024-12-13
**Current Status**: Phase 3 Complete - Core Services Migrated

---

## ✅ Phase 1: Branch Setup & Supabase Configuration (COMPLETE)

### Completed Tasks
- ✅ Created feature branch: `supabase-migration`
- ✅ Installed Supabase dependencies:
  - `@supabase/supabase-js`
  - `@supabase/ssr`
- ✅ Updated `.env.example` with Supabase variables
- ✅ Created Supabase client wrapper (`src/lib/supabase.ts`)
  - Server-side client (`createServerSupabaseClient()`)
  - Client-side client (`supabaseClient`)
  - Admin client (`supabaseAdmin`)
- ✅ Created Supabase query helpers (`src/lib/supabase-helpers.ts`)

### Files Created
- `src/lib/supabase.ts` - Main Supabase client configuration
- `src/lib/supabase-helpers.ts` - Reusable query helper functions

---

## ✅ Phase 2: Database Schema Migration (COMPLETE)

### Completed Tasks
- ✅ Converted Prisma schema to Supabase SQL
- ✅ Created migration files:
  - `001_initial_schema.sql` - Tables, enums, indexes, functions
  - `002_row_level_security.sql` - RLS policies
- ✅ Created migration README with instructions

### Files Created
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_row_level_security.sql`
- `supabase/migrations/README.md`

### Key Schema Elements
- **Enums**: Role, LeaveStatus, LeaveType, ToilType
- **Tables**: users, leave_requests, toil_entries
- **Indexes**: 15+ performance indexes
- **Functions**: CUID generation, updated_at triggers, auth helpers
- **RLS Policies**: User-level and admin-level access control

### Important Notes
- Column names converted from camelCase to snake_case
- Timestamps use TIMESTAMPTZ for proper timezone handling
- Custom `generate_cuid()` function for ID generation
- RLS policies require JWT claims integration with NextAuth

---

## ✅ Phase 3: Core Service Layer Migration (COMPLETE)

### Migrated Services

#### 1. Leave Service (`src/lib/services/leave.service.supabase.ts`)
**Original**: `src/lib/services/leave.service.ts`

**Key Changes**:
- Replaced `prisma.user.findUnique()` with Supabase select queries
- Converted `include` to Supabase join syntax
- Handled complex OR date range queries with multiple queries + deduplication
- Maintained all caching logic intact
- Preserved performance logging

**Functions Migrated**:
- ✅ `getUserLeaveBalance()` - Get user's leave balance with caching
- ✅ `checkUKAgentConflict()` - Check for UK agent conflicts
- ✅ `getBatchUserLeaveBalances()` - Batch balance operations
- ✅ `getTeamCalendarData()` - Team calendar with caching

**Migration Challenges**:
- Complex OR conditions required multiple queries + deduplication
- Join syntax different from Prisma `include`
- Column name mapping (camelCase → snake_case)

#### 2. TOIL Service (`src/lib/services/toil.service.supabase.ts`)
**Original**: `src/lib/services/toil.service.ts`

**Key Changes**:
- Replaced `prisma.$transaction()` with sequential operations + rollback logic
- Converted `increment` operations to manual calculation
- Maintained audit trail (previous_balance, new_balance)
- Added comprehensive error handling

**Functions Migrated**:
- ✅ `createToilEntry()` - Create pending TOIL entry
- ✅ `approveToilEntry()` - Approve and update balance (transaction-like)
- ✅ `rejectToilEntry()` - Reject TOIL entry
- ✅ `calculateToilHours()` - Business logic (unchanged)
- ✅ `getToilEntries()` - Fetch entries with optional user join
- ✅ `getPendingToilEntries()` - Admin view of pending entries
- ✅ `getUserToilBalance()` - Get user's TOIL balance

**Migration Challenges**:
- No explicit transactions - used sequential operations with rollback
- Manual rollback logic in `approveToilEntry()`

#### 3. Leave Balance Service (`src/lib/services/leave-balance.service.supabase.ts`)
**Original**: `src/lib/services/leave-balance.service.ts`

**Key Changes**:
- Replaced Prisma queries with Supabase
- Maintained feature flag integration
- Preserved backward compatibility

**Functions Migrated**:
- ✅ `getUserLeaveBalances()` - Comprehensive balance calculation
- ✅ `validateLeaveRequest()` - Balance validation logic
- ✅ `getLegacyLeaveBalance()` - Backward compatibility helper

---

## 🔄 Phase 4: API Routes Migration (PENDING)

### Routes to Migrate

#### Auth Routes (`src/app/api/auth/`)
- ⏳ `register/route.ts` - User registration
- ⏳ `forgot-password/route.ts` - Password reset request
- ⏳ `reset-password/route.ts` - Password reset confirmation

#### Leave Routes (`src/app/api/leave/`)
- ⏳ `balance/route.ts` - Get leave balance
- ⏳ `request/route.ts` - Create leave request
- ⏳ `request/[id]/approve/route.ts` - Approve request
- ⏳ `request/[id]/reject/route.ts` - Reject request
- ⏳ `request/[id]/cancel/route.ts` - Cancel request
- ⏳ `requests/route.ts` - List requests

#### Admin Routes (`src/app/api/admin/`)
- ⏳ `all-requests/route.ts` - All requests view
- ⏳ `pending-requests/route.ts` - Pending requests
- ⏳ `bulk-approve/route.ts` - Bulk operations
- ⏳ `bulk-reject/route.ts` - Bulk operations
- ⏳ `stats/route.ts` - Admin statistics
- ⏳ `toil/route.ts` - TOIL management
- ⏳ `employee-details/[employeeId]/route.ts` - Employee details

#### User Routes (`src/app/api/users/`)
- ⏳ `route.ts` - List users
- ⏳ `colleagues/route.ts` - Get colleagues

---

## 📋 Remaining Phases

### Phase 5: Authentication Integration
- Update `src/lib/auth.ts`
- Update `src/lib/auth-utils.ts`
- Update `src/lib/middleware/auth.ts`

### Phase 6: Utility & Helper Updates
- Update/replace `src/lib/prisma.ts`
- Remove `src/lib/prisma-middleware.ts`
- Update health check endpoint

### Phase 7: Seed Scripts & Data Migration
- Update `prisma/seed.ts`
- Update utility scripts in `scripts/`
- Create data migration script (if needed)

### Phase 8: Realtime Features Implementation
- Add realtime subscriptions for key tables
- Create custom React hooks (`src/hooks/useRealtime.ts`)
- Update components for realtime data

### Phase 9: Testing & Validation
- Update test files
- Integration testing
- Manual testing checklist

### Phase 10: Cleanup & Documentation
- Remove Prisma dependencies
- Update documentation
- Clean up old files

---

## Migration Strategy Summary

### Query Conversion Patterns

#### Find Unique
```typescript
// Before (Prisma)
const user = await prisma.user.findUnique({ where: { email } });

// After (Supabase)
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();
```

#### Find Many with Include
```typescript
// Before (Prisma)
const requests = await prisma.leaveRequest.findMany({
  include: { user: true },
  where: { status: 'PENDING' }
});

// After (Supabase)
const { data: requests } = await supabase
  .from('leave_requests')
  .select('*, users(*)')
  .eq('status', 'PENDING');
```

#### Transactions
```typescript
// Before (Prisma)
await prisma.$transaction(async (tx) => {
  await tx.toilEntry.update(...);
  await tx.user.update(...);
});

// After (Supabase) - Sequential with rollback
const entry = await supabase.from('toil_entries').update(...);
if (entry.error) throw error;

const user = await supabase.from('users').update(...);
if (user.error) {
  // Rollback previous operation
  await supabase.from('toil_entries').update(...);
  throw error;
}
```

---

## Key Decisions & Notes

### Database Function Approach
For complex transactions, we use sequential operations with manual rollback logic rather than creating PostgreSQL functions. This keeps business logic in TypeScript.

### Column Naming Convention
- Database: snake_case (Supabase standard)
- Application: camelCase (TypeScript standard)
- Mapping handled in service layer

### RLS Integration
RLS policies require JWT claims with user_id. Need to integrate with NextAuth to set custom claims.

### Caching Strategy
All existing cache logic preserved. Cache keys remain unchanged to avoid invalidation issues.

---

## Next Steps

1. **Before Proceeding**: Apply Supabase migrations
   - Run `001_initial_schema.sql` in Supabase dashboard
   - Run `002_row_level_security.sql` in Supabase dashboard
   - Verify tables and policies created successfully

2. **Phase 4**: Begin API route migration
   - Start with auth routes (critical path)
   - Then leave routes (core functionality)
   - Then admin routes
   - Finally user routes

3. **Testing Strategy**:
   - Create `.env.local.supabase` with Supabase credentials
   - Test each migrated route individually
   - Keep Prisma version as fallback during migration

---

## Rollback Plan

If issues occur:
1. Git checkout `master` branch
2. Restore `.env.local` with Prisma DATABASE_URL
3. Deploy Prisma version
4. Debug Supabase issues in feature branch

The `supabase-migration` branch contains all new files with `.supabase.ts` extension, allowing side-by-side comparison and easy rollback.
