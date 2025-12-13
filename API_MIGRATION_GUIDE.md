# API Route Migration Guide: Prisma to Supabase

This guide provides patterns for migrating API routes from Prisma to Supabase, based on the completed examples.

## Migration Pattern Overview

### Import Changes

**Before (Prisma)**:
```typescript
import { prisma } from '@/lib/prisma';
import { checkUKAgentConflict } from '@/lib/services/leave.service';
```

**After (Supabase)**:
```typescript
import { supabaseAdmin } from '@/lib/supabase';
import { checkUKAgentConflict } from '@/lib/services/leave.service.supabase';
```

## Common Query Patterns

### 1. Create (INSERT) Operations

**Prisma**:
```typescript
const leaveRequest = await prisma.leaveRequest.create({
  data: {
    userId: user.id,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    comments,
    status: 'PENDING',
    type,
    hours
  },
  include: {
    user: {
      select: {
        name: true,
        email: true,
      },
    },
  },
});
```

**Supabase**:
```typescript
const { data, error } = await supabaseAdmin
  .from('leave_requests')
  .insert({
    user_id: user.id,  // Note: snake_case
    start_date: new Date(startDate).toISOString(),
    end_date: new Date(endDate).toISOString(),
    comments,
    status: 'PENDING',
    type,
    hours,
  })
  .select(`
    *,
    user:users!leave_requests_user_id_fkey (
      name,
      email
    )
  `)
  .single();

if (error) {
  throw new Error(`Failed to create: ${error.message}`);
}
```

### 2. Find Unique/Single Record

**Prisma**:
```typescript
const leaveRequest = await prisma.leaveRequest.findUnique({
  where: { id: requestId },
  include: {
    user: {
      select: {
        name: true,
        email: true,
      },
    },
  },
});
```

**Supabase**:
```typescript
const { data: leaveRequest, error } = await supabaseAdmin
  .from('leave_requests')
  .select(`
    *,
    user:users!leave_requests_user_id_fkey (
      name,
      email
    )
  `)
  .eq('id', requestId)
  .single();

if (error || !leaveRequest) {
  return apiError('Leave request not found', 404);
}
```

### 3. Find Many with Filters

**Prisma**:
```typescript
const leaveRequests = await prisma.leaveRequest.findMany({
  where: {
    userId: user.id,
    status: 'PENDING'
  },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: offset,
  include: {
    user: {
      select: {
        name: true,
        email: true,
      },
    },
  },
});
```

**Supabase**:
```typescript
const { data: leaveRequests, error } = await supabaseAdmin
  .from('leave_requests')
  .select(`
    *,
    user:users!leave_requests_user_id_fkey (
      name,
      email
    )
  `)
  .eq('user_id', user.id)
  .eq('status', 'PENDING')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

if (error) {
  throw new Error(`Failed to fetch: ${error.message}`);
}
```

### 4. Update Operations

**Prisma**:
```typescript
const updatedRequest = await prisma.leaveRequest.update({
  where: { id: requestId },
  data: {
    status: 'APPROVED',
    approvedBy: admin.name,
    approvedAt: new Date(),
  },
  include: {
    user: {
      select: {
        name: true,
        email: true,
      },
    },
  },
});
```

**Supabase**:
```typescript
const { data: updatedRequest, error } = await supabaseAdmin
  .from('leave_requests')
  .update({
    status: 'APPROVED',
    approved_by: admin.name,
    approved_at: new Date().toISOString(),
  })
  .eq('id', requestId)
  .select(`
    *,
    user:users!leave_requests_user_id_fkey (
      name,
      email
    )
  `)
  .single();

if (error) {
  throw new Error(`Failed to update: ${error.message}`);
}
```

### 5. Count Operations

**Prisma**:
```typescript
const totalCount = await prisma.leaveRequest.count({
  where: { status: 'PENDING' }
});
```

**Supabase**:
```typescript
const { count: totalCount, error } = await supabaseAdmin
  .from('leave_requests')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'PENDING');

if (error) {
  throw new Error(`Failed to count: ${error.message}`);
}
```

### 6. Transactions (Complex)

**Prisma**:
```typescript
const result = await prisma.$transaction(async (tx) => {
  const current = await tx.leaveRequest.findUnique({
    where: { id: requestId }
  });

  if (!current || current.status !== 'PENDING') {
    throw new Error('Invalid state');
  }

  return await tx.leaveRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED' }
  });
});
```

**Supabase** (Sequential with rollback):
```typescript
// Step 1: Check current state
const { data: current, error: checkError } = await supabaseAdmin
  .from('leave_requests')
  .select('status')
  .eq('id', requestId)
  .single();

if (checkError || !current || current.status !== 'PENDING') {
  throw new ValidationError('Invalid state');
}

// Step 2: Update
const { data: result, error: updateError } = await supabaseAdmin
  .from('leave_requests')
  .update({ status: 'APPROVED' })
  .eq('id', requestId)
  .select()
  .single();

if (updateError) {
  throw new Error(`Failed to update: ${updateError.message}`);
}
```

### 7. Parallel Queries

**Prisma**:
```typescript
const [requests, totalCount] = await Promise.all([
  prisma.leaveRequest.findMany({ where: { status: 'PENDING' } }),
  prisma.leaveRequest.count({ where: { status: 'PENDING' } })
]);
```

**Supabase**:
```typescript
const [requestsResult, countResult] = await Promise.all([
  supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('status', 'PENDING'),
  supabaseAdmin
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING')
]);

const { data: requests, error: requestsError } = requestsResult;
const { count: totalCount, error: countError } = countResult;

if (requestsError) throw new Error(requestsError.message);
if (countError) throw new Error(countError.message);
```

## Field Name Mapping (snake_case ↔ camelCase)

### Database (snake_case) → Application (camelCase)

After fetching from Supabase, convert field names:

```typescript
const convertToFrontend = (dbRecord: any) => ({
  id: dbRecord.id,
  userId: dbRecord.user_id,
  startDate: dbRecord.start_date,
  endDate: dbRecord.end_date,
  approvedBy: dbRecord.approved_by,
  approvedAt: dbRecord.approved_at,
  createdAt: dbRecord.created_at,
  updatedAt: dbRecord.updated_at,
  // ... other fields
});
```

### Application (camelCase) → Database (snake_case)

When inserting/updating:

```typescript
const data = {
  user_id: userId,
  start_date: startDate,
  end_date: endDate,
  approved_by: approvedBy,
  // ... other fields
};
```

## Join Syntax

### Prisma Include
```typescript
include: {
  user: {
    select: {
      name: true,
      email: true,
    },
  },
}
```

### Supabase Select with Join
```typescript
.select(`
  *,
  user:users!leave_requests_user_id_fkey (
    name,
    email
  )
`)
```

**Foreign Key Reference Format**: `table_name!foreign_key_constraint_name`

To find the constraint name, check the migration file `001_initial_schema.sql`:
```sql
CONSTRAINT "leave_requests_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
```

## Error Handling Pattern

```typescript
try {
  const { data, error } = await supabaseAdmin
    .from('table_name')
    .select('*');

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // Process data...
  return apiSuccess(data);

} catch (error) {
  if (error instanceof ValidationError) {
    return apiError(error, error.statusCode);
  }

  logger.error('Unexpected error', {}, error as Error);
  return apiError('Internal server error', 500);
}
```

## Complete Migration Checklist

For each API route file:

- [ ] Update imports (`prisma` → `supabaseAdmin`)
- [ ] Update service imports (add `.supabase` suffix)
- [ ] Convert `create()` to `insert().select().single()`
- [ ] Convert `findUnique()` to `select().eq().single()`
- [ ] Convert `findMany()` to `select()` with filters
- [ ] Convert `update()` to `update().eq().select().single()`
- [ ] Convert `count()` to `select('*', { count: 'exact', head: true })`
- [ ] Convert `$transaction()` to sequential operations with checks
- [ ] Map camelCase to snake_case for database operations
- [ ] Map snake_case to camelCase for responses
- [ ] Update join syntax from `include` to foreign key select
- [ ] Add proper error handling for Supabase responses
- [ ] Test the migrated route

## Migrated Examples

Reference these files for complete examples:

1. **Create/List Pattern**: `src/app/api/leave/request/route.supabase.ts`
   - POST: Create with validation
   - GET: List with pagination and filtering

2. **Update Pattern**: `src/app/api/leave/request/[id]/approve/route.supabase.ts`
   - POST: Update with race condition protection
   - Transaction-like sequential operations

3. **Complex Query Pattern**: `src/app/api/admin/pending-requests/route.supabase.ts`
   - Parallel queries (data + count)
   - Data transformation
   - Caching

## Remaining Routes to Migrate

### Auth Routes (3 files)
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`

### Leave Routes (4 files)
- `src/app/api/leave/balance/route.ts`
- `src/app/api/leave/request/[id]/reject/route.ts`
- `src/app/api/leave/request/[id]/cancel/route.ts`
- `src/app/api/leave/requests/route.ts`

### Admin Routes (7 files)
- `src/app/api/admin/all-requests/route.ts`
- `src/app/api/admin/bulk-approve/route.ts`
- `src/app/api/admin/bulk-reject/route.ts`
- `src/app/api/admin/stats/route.ts`
- `src/app/api/admin/toil/route.ts`
- `src/app/api/admin/employee-details/[employeeId]/route.ts`
- (pending-requests already migrated)

### User Routes (2 files)
- `src/app/api/users/route.ts`
- `src/app/api/users/colleagues/route.ts`

## Testing Each Route

After migrating each route:

1. Start the dev server with Supabase credentials
2. Test the endpoint with appropriate auth tokens
3. Verify data is correctly saved/retrieved
4. Check error handling works correctly
5. Confirm caching behavior (if applicable)

## Common Pitfalls

1. **Forgetting snake_case conversion**: Database uses snake_case, app uses camelCase
2. **Missing error checks**: Always check `error` from Supabase responses
3. **Join syntax**: Use `!constraint_name` for foreign key joins
4. **Date handling**: Convert to ISO strings for Supabase
5. **Transaction replacement**: Use sequential operations with proper checks
6. **Count queries**: Need `{ count: 'exact', head: true }` parameter

---

**Last Updated**: 2024-12-13
**Migration Status**: Phase 4 In Progress - 3/16 routes migrated
