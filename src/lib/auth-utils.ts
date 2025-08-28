import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { AuthenticationError } from "./api/errors";
import type { User } from "@prisma/client";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: "USER" | "ADMIN";
}) {
  const hashedPassword = await hashPassword(data.password);
  
  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || "USER",
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Get authenticated user from session
 * Throws AuthenticationError if user is not authenticated or not found
 */
export async function getAuthenticatedUser(): Promise<User> {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new AuthenticationError('You must be logged in to access this resource');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  return user;
}

/**
 * Require admin role for the authenticated user
 * Throws AuthenticationError if user is not admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAuthenticatedUser();
  
  if (user.role !== 'ADMIN') {
    throw new AuthenticationError('Administrator access required');
  }

  return user;
}

/**
 * Get authenticated user or null if not authenticated
 * Does not throw errors, returns null instead
 */
export async function getOptionalAuthenticatedUser(): Promise<User | null> {
  try {
    return await getAuthenticatedUser();
  } catch {
    return null;
  }
}
