import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
