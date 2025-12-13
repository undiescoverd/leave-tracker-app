import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase configuration
// New API keys (recommended): sb_publishable_... and sb_secret_...
// Old API keys (still supported): anon and service_role JWT keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabasePublishableKey) {
  const newKeyName = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
  const oldKeyName = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
  throw new Error(
    `Missing Supabase environment variables. Please set ${newKeyName} (recommended) or ${oldKeyName} (legacy). ` +
    `Also ensure NEXT_PUBLIC_SUPABASE_URL is set.`
  );
}

/**
 * Client-side Supabase client for use in React components
 * This client uses the publishable key (or legacy anon key) and respects Row Level Security (RLS)
 * 
 * The publishable key is safe to expose in client-side code as it requires Row Level Security
 * policies to be properly configured for data protection.
 */
export const supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Server-side Supabase client for use in API routes and Server Components
 * This client uses cookies for authentication and respects RLS
 *
 * Usage in API routes:
 * ```ts
 * import { createServerSupabaseClient } from '@/lib/supabase';
 *
 * export async function GET(request: Request) {
 *   const supabase = await createServerSupabaseClient();
 *   const { data, error } = await supabase.from('users').select('*');
 *   return Response.json({ data, error });
 * }
 * ```
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Admin Supabase client with secret key (or legacy service_role key)
 * This client bypasses Row Level Security (RLS) and should only be used in server-side code
 *
 * WARNING: Only use this for admin operations that need to bypass RLS.
 * NEVER expose the secret key in client-side code, browser, or public repositories.
 *
 * The secret key provides full access to your project's data and bypasses all RLS policies.
 * It will automatically return HTTP 401 if used in browser contexts.
 *
 * Usage:
 * ```ts
 * import { supabaseAdmin } from '@/lib/supabase';
 *
 * // Admin operation that bypasses RLS
 * const { data, error } = await supabaseAdmin.from('users').select('*');
 * ```
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Helper function to handle Supabase errors
 * Converts Supabase error format to a standardized error object
 */
export function handleSupabaseError(error: any): Error {
  if (!error) {
    return new Error('Unknown error occurred');
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error.message) {
    return new Error(error.message);
  }

  return new Error('An unexpected error occurred');
}

/**
 * Type helper for Supabase queries
 * Ensures type safety when working with database queries
 */
export type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

// Logging configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const verboseLogging = process.env.VERBOSE_LOGGING === 'true';

if (isDevelopment) {
  console.log('Supabase client initialized');

  if (verboseLogging) {
    console.log('Supabase URL:', supabaseUrl);
    console.log('Verbose Supabase logging enabled');
  }
}

// Export a singleton admin client for global use
export { supabaseAdmin as supabase };
