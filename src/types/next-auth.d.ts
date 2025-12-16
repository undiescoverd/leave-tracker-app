import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

/**
 * Define allowed user roles:
 * - USER: Regular employee with leave balance
 * - ADMIN: Employee admin with leave balance who can approve leave
 * - TECH_ADMIN: Technical admin without leave balance, full admin permissions
 * - OWNER: Business owner without leave balance, full admin permissions
 */
export type UserRole = "USER" | "ADMIN" | "TECH_ADMIN" | "OWNER";

/**
 * Admin role types (all three admin variants)
 * Any of these roles grants admin permissions
 */
export type AdminRole = "ADMIN" | "TECH_ADMIN" | "OWNER";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
  }
}
