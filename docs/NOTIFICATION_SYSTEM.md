# Notification System Documentation

## Overview

The TDH Agency Leave Tracker implements a comprehensive notification system that ensures users only see notification badges for items requiring action, not for historical reference data.

## Core Principles

### ✅ Actionable Notifications (Show Badge Numbers)
Notifications that require user action should display badge numbers:

**For Admins:**
- Pending leave requests awaiting approval
- Pending TOIL requests awaiting approval
- New user registrations requiring approval

**For Regular Users:**
- Their own pending requests (awaiting admin action)
- Rejected requests requiring resubmission
- System notifications requiring user action

### ❌ Reference Notifications (No Badge Numbers)
Historical or informational data should not show notification badges:

**For Admins:**
- Total approved requests this month
- All historical requests
- Completed TOIL entries

**For Regular Users:**
- Their own approved/rejected requests
- Historical leave data
- Calendar events (for reference)

## Implementation

### Notification Policy (`src/lib/notifications/notification-policy.ts`)

The notification policy defines:
- `isActionableLeaveRequest()` - Determines if a leave request requires action
- `isActionableToilEntry()` - Determines if a TOIL entry requires action
- `calculateAdminNotifications()` - Calculates actionable counts for admins
- `calculateUserNotifications()` - Calculates actionable counts for regular users
- `shouldShowNotificationBadge()` - Determines if a badge should be displayed
- `getNotificationBadgeVariant()` - Gets appropriate badge styling based on urgency

### API Changes

#### Admin Stats API (`src/app/api/admin/stats/route.ts`)
- Now calculates actionable vs reference notifications
- Returns only actionable counts for badge display
- Includes breakdown data for debugging

#### User Leave Balance API (`src/app/api/leave/balance/route.ts`)
- Filters pending requests to show only actionable items
- Uses notification policy for consistent behavior

### UI Components

#### Admin Dashboard (`src/components/dashboard/AdminActions.tsx`)
- Uses notification policy for badge display
- Shows different badge variants based on urgency
- Only displays badges for actionable items

#### User Leave Balance (`src/components/EnhancedLeaveBalanceDisplay.tsx`)
- Only shows pending request badges for actionable items
- Uses notification policy consistently

### Cache Management (`src/lib/cache/notification-cache-invalidation.ts`)

Proper cache invalidation ensures:
- Dashboard data stays fresh when statuses change
- No stale notification counts
- Consistent data across all views

## Usage Examples

### Checking if a Request is Actionable

```typescript
import { isActionableLeaveRequest } from '@/lib/notifications/notification-policy';

// For admin users - all pending requests are actionable
const isActionable = isActionableLeaveRequest('PENDING', 'ADMIN');

// For regular users - only their own pending requests are actionable
const isActionable = isActionableLeaveRequest('PENDING', 'USER', userId, requestUserId);
```

### Displaying Notification Badges

```typescript
import { shouldShowNotificationBadge, getNotificationBadgeVariant } from '@/lib/notifications/notification-policy';

// Only show badge if there are actionable notifications
{shouldShowNotificationBadge(count) && (
  <Badge variant={getNotificationBadgeVariant(count)}>
    {count}
  </Badge>
)}
```

### Cache Invalidation

```typescript
import { invalidateOnLeaveRequestStatusChange } from '@/lib/cache/notification-cache-invalidation';

// When a request status changes
invalidateOnLeaveRequestStatusChange(requestId, userId, adminId);
```

## Testing

### Manual Testing Checklist

1. **Admin Dashboard**
   - [ ] Only shows badge numbers for pending requests
   - [ ] No badges for approved/rejected requests
   - [ ] Badge colors change based on urgency
   - [ ] Cache refreshes when statuses change

2. **User Dashboard**
   - [ ] Only shows pending badges for their own requests
   - [ ] No badges for historical requests
   - [ ] Badges disappear when requests are approved/rejected

3. **Cache Behavior**
   - [ ] Dashboard updates immediately when statuses change
   - [ ] No stale notification counts
   - [ ] Consistent data across all views

### Debugging

Enable debug logging by checking the browser console for:
- Cache invalidation events
- Notification calculation logs
- API response breakdown data

## Migration Notes

### Breaking Changes
- Admin stats API now returns different data structure
- User balance API filters pending requests differently
- Badge display logic is more strict

### Backward Compatibility
- Legacy API responses still work
- Old badge display logic is maintained where needed
- Gradual migration path available

## Future Enhancements

1. **Real-time Notifications**
   - WebSocket updates for immediate badge changes
   - Push notifications for mobile users

2. **Notification Preferences**
   - User-configurable notification types
   - Email/SMS notification options

3. **Advanced Filtering**
   - Date-based notification filtering
   - Priority-based notification sorting

4. **Analytics**
   - Notification engagement tracking
   - Response time metrics

## Troubleshooting

### Common Issues

1. **Stale Notification Counts**
   - Check cache invalidation is working
   - Verify API responses include fresh data
   - Clear browser cache if needed

2. **Incorrect Badge Display**
   - Verify notification policy logic
   - Check user roles and permissions
   - Review API response data structure

3. **Performance Issues**
   - Monitor cache hit rates
   - Check API response times
   - Review database query performance

### Debug Commands

```typescript
// Force refresh all notification data
import { forceRefreshNotificationData } from '@/lib/cache/notification-cache-invalidation';
forceRefreshNotificationData();

// Check current cache state
console.log('Stats cache:', statsCache.keys());
console.log('User cache:', userDataCache.keys());
console.log('API cache:', apiCache.keys());
```
