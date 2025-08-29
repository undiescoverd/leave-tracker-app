import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// Simple environment check without Zod for now
const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  DATABASE_URL: process.env.DATABASE_URL,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("❌ Missing environment variables:", missingVars);
  console.error("Please check your .env file");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        try {
          const email = (credentials.email as string).trim().toLowerCase();
          const password = credentials.password as string;

          const user = await prisma.user.findUnique({
            where: {
              email: email
            }
          });

          if (!user) {
            console.log("User not found:", email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            console.log("Invalid password for:", email);
            return null;
          }

          console.log("Authentication successful for:", email);
          return {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async signIn({ user, account, profile }: any) {
      return true;
    }
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
        domain: undefined,
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    },
    callbackUrl: {
      name: `authjs.callback-url`,
      options: {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        secure: false,
        maxAge: 24 * 60 * 60 // 24 hours
      }
    },
    csrfToken: {
      name: `authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
        maxAge: 60 * 60 // 1 hour
      }
    }
  },
  useSecureCookies: false,
  trustHost: true,
  experimental: {
    enableWebAuthn: false,
  },
});
