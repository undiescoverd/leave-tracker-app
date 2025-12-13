# Supabase Realtime Features

This directory contains the realtime infrastructure for the Leave Tracker App using Supabase Realtime.

## Overview

Supabase Realtime allows the application to subscribe to database changes and receive live updates without polling. This provides:

- **Instant notifications** when leave requests are approved/rejected
- **Live team calendar** updates when colleagues take leave
- **Real-time balance updates** when leave is approved
- **Admin notifications** for new leave requests
- **TOIL approval notifications** in real-time

## Architecture

```
src/lib/realtime/
  ├── supabase-realtime.ts       # Core realtime service
  └── REALTIME_README.md          # This file

src/hooks/
  ├── useRealtimeLeaveRequests.ts # Leave request subscriptions
  ├── useRealtimeTeamCalendar.ts  # Team calendar subscriptions
  ├── useRealtimeBalance.ts       # Balance update subscriptions
  └── useRealtimeNotifications.ts # Notification system
```

## Core Service (`supabase-realtime.ts`)

Low-level functions for creating Supabase realtime subscriptions:

### Functions

- `subscribeToUserLeaveRequests(userId, callback)` - Subscribe to user's leave requests
- `subscribeToAllLeaveRequests(callback)` - Subscribe to all leave requests (admin)
- `subscribeToPendingRequests(callback)` - Subscribe to pending requests only
- `subscribeToTeamCalendar(callback)` - Subscribe to approved leave (team calendar)
- `subscribeToUserBalance(userId, callback)` - Subscribe to balance changes
- `subscribeToUserToilEntries(userId, callback)` - Subscribe to TOIL entries
- `isRealtimeConnected()` - Check if any realtime channels are connected
- `unsubscribeAll()` - Cleanup all subscriptions

### Example Usage

```typescript
import { subscribeToUserLeaveRequests } from '@/lib/realtime/supabase-realtime';

const subscription = subscribeToUserLeaveRequests('user-id', (change) => {
  console.log('Change type:', change.type); // INSERT, UPDATE, DELETE
  console.log('New data:', change.data);
  console.log('Old data:', change.old);
});

// Later: cleanup
subscription.unsubscribe();
```

## React Hooks

### `useRealtimeLeaveRequests`

Subscribe to leave request changes for a specific user or all users (admin).

```typescript
import { useRealtimeLeaveRequests } from '@/hooks/useRealtimeLeaveRequests';

// User view - subscribe to own requests
function MyLeaveRequests() {
  useRealtimeLeaveRequests({
    userId: currentUser.id,
    onUpdate: (data, old) => {
      if (data.status === 'APPROVED') {
        showNotification('Your leave was approved!');
      }
    },
  });

  return <LeaveRequestsList />;
}

// Admin view - subscribe to all pending requests
function AdminDashboard() {
  useRealtimeLeaveRequests({
    isAdmin: true,
    onlyPending: true,
    onInsert: (data) => {
      showNotification(`New leave request from ${data.user.name}`);
    },
  });

  return <PendingRequestsList />;
}
```

**Options:**
- `userId` - User ID to filter by (user view)
- `isAdmin` - Subscribe to all requests (admin view)
- `onlyPending` - Only subscribe to pending requests
- `enabled` - Enable/disable subscription (default: true)
- `onInsert` - Callback when new request created
- `onUpdate` - Callback when request updated
- `onDelete` - Callback when request deleted
- `onChange` - General callback for all changes

### `useRealtimeTeamCalendar`

Subscribe to approved leave requests for team calendar view.

```typescript
import { useRealtimeTeamCalendar } from '@/hooks/useRealtimeTeamCalendar';

function TeamCalendar() {
  const [calendarData, setCalendarData] = useState([]);

  useRealtimeTeamCalendar({
    onLeaveApproved: (data) => {
      // Add new approved leave to calendar
      setCalendarData(prev => [...prev, data]);
    },
    onLeaveCancelled: (old) => {
      // Remove cancelled leave from calendar
      setCalendarData(prev => prev.filter(item => item.id !== old.id));
    },
  });

  return <Calendar data={calendarData} />;
}
```

**Options:**
- `enabled` - Enable/disable subscription (default: true)
- `onLeaveApproved` - New approved leave added
- `onLeaveUpdated` - Approved leave dates changed
- `onLeaveCancelled` - Approved leave cancelled
- `onChange` - General callback for all changes

### `useRealtimeBalance`

Subscribe to user's leave balance changes.

```typescript
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';

function LeaveBalanceWidget() {
  const [balances, setBalances] = useState(null);

  useRealtimeBalance({
    userId: currentUser.id,
    onBalanceChange: (newBalances) => {
      setBalances(newBalances);
      // Show animation or notification
      showBalanceUpdate(newBalances);
    },
  });

  return <BalanceDisplay balances={balances} />;
}
```

**Options:**
- `userId` - User ID (required)
- `enabled` - Enable/disable subscription (default: true)
- `onBalanceChange` - Callback with new balances

**Balance Object:**
```typescript
{
  annualLeave: number;
  toil: number;
  sickLeave: number;
}
```

### `useRealtimeNotifications`

Comprehensive notification system combining leave and TOIL updates.

```typescript
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useRealtimeNotifications({
    userId: currentUser.id,
    onNotification: (notification) => {
      // Show toast notification
      toast.success(notification.message);

      // Play sound
      playNotificationSound();
    },
  });

  return (
    <NotificationDropdown
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAsRead={markAsRead}
      onClearAll={clearAll}
    />
  );
}
```

**Options:**
- `userId` - User ID for user notifications
- `isAdmin` - Enable admin notifications (new leave requests)
- `enabled` - Enable/disable subscription (default: true)
- `maxNotifications` - Max notifications to keep (default: 50)
- `onNotification` - Callback when new notification received

**Notification Types:**
- `leave_approved` - User's leave request approved
- `leave_rejected` - User's leave request rejected
- `leave_cancelled` - User's leave request cancelled
- `new_leave_request` - New leave request submitted (admin)
- `toil_approved` - TOIL entry approved
- `toil_rejected` - TOIL entry rejected

**Notification Object:**
```typescript
{
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  read?: boolean;
}
```

## Database Tables Monitored

The realtime system monitors these Supabase tables:

1. **`leave_requests`**
   - INSERT: New leave request created
   - UPDATE: Leave status changed (PENDING → APPROVED/REJECTED)
   - DELETE: Leave request deleted/cancelled

2. **`users`**
   - UPDATE: Leave balances changed (annual, TOIL, sick)

3. **`toil_entries`**
   - INSERT: New TOIL entry created
   - UPDATE: TOIL entry approved/rejected
   - DELETE: TOIL entry removed

## Row Level Security (RLS)

Realtime subscriptions respect Row Level Security policies. Users can only receive updates for:

- Their own leave requests
- Their own TOIL entries
- Their own balance changes
- Approved leave (for team calendar)
- Admins can see all changes

RLS policies are defined in `supabase/migrations/002_row_level_security.sql`.

## Performance Considerations

### Connection Management

- Each hook automatically manages its own subscription
- Subscriptions are automatically cleaned up on unmount
- Multiple components can subscribe independently
- Supabase manages connection pooling

### Best Practices

1. **Conditional Subscriptions**: Use `enabled` prop to control subscriptions
   ```typescript
   useRealtimeLeaveRequests({
     userId: currentUser?.id,
     enabled: !!currentUser && isPageActive,
   });
   ```

2. **Cleanup on Navigation**: Hooks auto-cleanup, but consider:
   ```typescript
   useEffect(() => {
     return () => {
       // Additional cleanup if needed
     };
   }, []);
   ```

3. **Debounce Rapid Updates**: For frequently updating data:
   ```typescript
   const debouncedUpdate = useMemo(
     () => debounce((data) => updateUI(data), 300),
     []
   );

   useRealtimeLeaveRequests({
     onUpdate: debouncedUpdate,
   });
   ```

## Debugging

### Check Connection Status

```typescript
import { isRealtimeConnected } from '@/lib/realtime/supabase-realtime';

if (isRealtimeConnected()) {
  console.log('Realtime is connected');
} else {
  console.log('Realtime is disconnected');
}
```

### Enable Supabase Realtime Logs

```typescript
// In src/lib/supabase.ts
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    log_level: 'debug', // Enable debug logs
  },
});
```

### Common Issues

**Issue**: Subscriptions not receiving updates
- **Solution**: Check RLS policies allow the user to SELECT the table
- **Solution**: Verify the filter matches the data (e.g., correct user_id)

**Issue**: Too many connections
- **Solution**: Ensure `enabled={false}` when component is not visible
- **Solution**: Use `unsubscribeAll()` on app close/logout

**Issue**: Delayed updates
- **Solution**: Supabase Realtime has ~100-500ms latency (normal)
- **Solution**: Check network tab for websocket connection issues

## Testing Realtime Features

### Manual Testing

1. **Open two browser windows**
2. **Login as different users** (admin + regular user)
3. **Create a leave request** in one window
4. **Observe notification** in admin window
5. **Approve the request** in admin window
6. **Observe notification** in user window

### Development Tools

```typescript
// Log all realtime events
useRealtimeLeaveRequests({
  onChange: (change) => {
    console.log('Realtime event:', change);
  },
});
```

## Migration from Polling

If your app currently uses polling, replace:

```typescript
// OLD: Polling every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchLeaveRequests();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

With:

```typescript
// NEW: Real-time updates
useRealtimeLeaveRequests({
  userId: currentUser.id,
  onUpdate: () => {
    // Refetch or update state directly
    fetchLeaveRequests();
  },
});
```

## Future Enhancements

Potential additions:

- **Presence**: Show who's viewing the admin dashboard
- **Broadcast**: Chat system for leave request discussions
- **Typing Indicators**: Show when admin is processing a request
- **Optimistic Updates**: Update UI before server confirmation

## Learn More

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [React Hooks Best Practices](https://react.dev/reference/react)
