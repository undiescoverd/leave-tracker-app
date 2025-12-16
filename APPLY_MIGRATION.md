# Quick Guide: Apply Real-Time Migration

## ⚡ Easiest Method: Supabase Dashboard (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/cbnxzhxtbebattgojiaw
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy & Paste This SQL

```sql
-- Enable REPLICA IDENTITY on tables
ALTER TABLE "leave_requests" REPLICA IDENTITY FULL;
ALTER TABLE "toil_entries" REPLICA IDENTITY FULL;
ALTER TABLE "users" REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE "leave_requests";
ALTER PUBLICATION supabase_realtime ADD TABLE "toil_entries";
ALTER PUBLICATION supabase_realtime ADD TABLE "users";
```

### Step 3: Click "Run" (or press Cmd+Enter)

You should see:
```
Success. No rows returned
```

### Step 4: Verify It Worked

Run this verification query:
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

You should see:
```
leave_requests
toil_entries
users
```

## ✅ Done!

Your real-time subscriptions are now enabled. The app will now update instantly across all users!

## 🧪 Test It

1. Open browser window 1: http://localhost:3000/admin/pending-requests (as admin)
2. Open browser window 2: http://localhost:3000/dashboard (as regular user)
3. Submit a leave request in window 2
4. Watch window 1 update **instantly** without refresh!

## 🔧 Troubleshooting

### If you get "publication already contains table"
That means the table is already added - this is fine! The migration was already partially applied.

### If you get "permission denied"
Make sure you're logged into Supabase as the project owner.

### If real-time still doesn't work
1. Check browser console for WebSocket errors
2. Verify environment variables are set correctly
3. Hard refresh the browser (Cmd+Shift+R)
