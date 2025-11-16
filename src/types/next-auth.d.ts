import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// Define allowed user roles
export type UserRole = "USER" | "ADMIN";

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
