import { getSession as getSessionImport } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cache } from "react";

const getSessionCached = cache(async () => getSessionImport());

const getCurrentUserByEmailCached = cache(async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      university: true,
      department: true,
      batch: true,
      isUniversityEmail: true,
    },
  });
});

const getRoleByEmailCached = cache(async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
});

/**
 * Check if the current user has admin role
 */
export async function getSession() {
  return await getSessionCached();
}

export async function isAdmin(email: string): Promise<boolean> {
  const user = await getRoleByEmailCached(email);
  
  return user?.role === 'ADMIN';
}

export async function requireAdmin() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const admin = await isAdmin(session.user.email);
  
  if (!admin) {
    redirect("/");
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return null;
  }

  return await getCurrentUserByEmailCached(session.user.email);
}

export async function requireUniversityUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  if (!user?.isUniversityEmail) {
    redirect("/");
  }

  return user;
}
