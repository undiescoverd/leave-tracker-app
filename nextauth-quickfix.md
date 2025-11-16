# NextAuth ClientFetchError Quick Fix

## Issue Identified
You're using NextAuth v5.0.0-beta.29, which can have stability issues.

## Quick Fix Options

### Option 1: Force Restart (Try this first)
```bash
# Kill all Node processes
pkill -f node

# Clear Next.js cache
rm -rf .next

# Restart development server
npm run dev
```

### Option 2: Update NextAuth Configuration
The issue might be with the beta version configuration. Update your `src/lib/auth.ts`:

```typescript
// Add these lines at the top of auth.ts
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// Ensure trustHost is explicitly set
export const { handlers, auth, signIn, signOut } = NextAuth({
  // ... existing config
  trustHost: true,
  basePath: "/api/auth",
  // Force development settings
  ...(process.env.NODE_ENV === 'development' && {
    logger: {
      error(code, metadata) {
        console.error('NextAuth Error:', code, metadata);
      },
      warn(code) {
        console.warn('NextAuth Warning:', code);
      },
      debug(code, metadata) {
        console.log('NextAuth Debug:', code, metadata);
      }
    }
  })
});
```

### Option 3: Downgrade to Stable Version (If problem persists)
```bash
npm uninstall next-auth
npm install next-auth@4.24.7
```

Then update imports from:
```typescript
import { handlers } from "@/lib/auth";
```

To:
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Option 4: Check Browser Network Tab
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Try to log in
4. Look for failed requests to `/api/auth/*`
5. Check the exact error message

## Current Status
- ✅ Environment variables are configured
- ✅ TOIL feature flags are enabled
- ⚠️ Using beta version of NextAuth (potential instability)

## Test Steps
1. Try Option 1 (restart) first
2. If still failing, run: `node test-nextauth-api.js`
3. Check browser console for detailed errors
4. If needed, try Option 2 or 3

The ClientFetchError typically resolves with a clean restart when environment is properly configured.