import { getSession as getSessionImport } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Check if the current user has admin role
 */
export async function getSession() {
  return await getSessionImport();
}

export async function isAdmin(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  
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

  return await prisma.user.findUnique({
    where: { email: session.user.email },
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
}

export async function requireUniversityUser() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
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

  if (!user?.isUniversityEmail) {
    redirect("/");
  }

  return user;
}
