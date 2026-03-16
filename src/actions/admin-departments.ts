"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Get all departments for a university
 */
export async function getDepartments(university?: string) {
  const where = university ? { university } : {};
  
  return await prisma.departmentConfig.findMany({
    where,
    include: {
      batches: true,
      subjects: true,
      _count: {
        select: {
          batches: true,
          subjects: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });
}

/**
 * Get a single department by ID
 */
export async function getDepartment(id: string) {
  return await prisma.departmentConfig.findUnique({
    where: { id },
    include: {
      batches: true,
      subjects: true,
    },
  });
}

/**
 * Create a new department (admin only)
 */
export async function createDepartment(data: {
  code: string;
  name: string;
  description?: string;
  university: string;
}) {
  await requireAdmin();

  const department = await prisma.departmentConfig.create({
    data: {
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description,
      university: data.university,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return department;
}

/**
 * Update a department (admin only)
 */
export async function updateDepartment(
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
  }
) {
  await requireAdmin();

  const department = await prisma.departmentConfig.update({
    where: { id },
    data: {
      ...(data.code && { code: data.code.toUpperCase() }),
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return department;
}

/**
 * Delete a department (admin only)
 * This will cascade delete all batches and subjects
 */
export async function deleteDepartment(id: string) {
  await requireAdmin();

  await prisma.departmentConfig.delete({
    where: { id },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return { success: true };
}

/**
 * Toggle department active status (admin only)
 */
export async function toggleDepartmentStatus(id: string) {
  await requireAdmin();

  const department = await prisma.departmentConfig.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!department) {
    throw new Error("Department not found");
  }

  const updated = await prisma.departmentConfig.update({
    where: { id },
    data: { isActive: !department.isActive },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return updated;
}
