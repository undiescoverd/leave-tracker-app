import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Client-side Supabase client for use in React components
 * This client uses the anon key and respects Row Level Security (RLS)
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
 *   const supabase = createServerSupabaseClient();
 *   const { data, error } = await supabase.from('users').select('*');
 *   return Response.json({ data, error });
 * }
 * ```
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
 * Admin Supabase client with service role key
 * This client bypasses Row Level Security (RLS) and should only be used in server-side code
 *
 * WARNING: Only use this for admin operations that need to bypass RLS
 *
 * Usage:
 * ```ts
 * import { supabaseAdmin } from '@/lib/supabase';
 *
 * // Admin operation that bypasses RLS
 * const { data, error } = await supabaseAdmin.from('users').select('*');
 * ```
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
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
export type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

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
