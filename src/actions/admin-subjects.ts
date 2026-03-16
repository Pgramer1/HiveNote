"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Get all subjects with filters
 */
export async function getSubjectsAdmin(filters?: {
  university?: string;
  departmentId?: string;
  semester?: number;
  isActive?: boolean;
}) {
  return await prisma.subject.findMany({
    where: filters,
    include: {
      departmentConfig: {
        select: { id: true, code: true, name: true },
      },
      _count: {
        select: {
          resources: true,
        },
      },
    },
    orderBy: [
      { semester: 'asc' },
      { code: 'asc' },
    ],
  });
}

/**
 * Get a single subject by ID
 */
export async function getSubjectAdmin(id: string) {
  return await prisma.subject.findUnique({
    where: { id },
    include: {
      departmentConfig: {
        select: { id: true, code: true, name: true },
      },
      batchConfig: {
        select: { id: true, code: true, years: true },
      },
      _count: {
        select: {
          resources: true,
        },
      },
    },
  });
}

/**
 * Create a new subject (Admin only)
 */
export async function createSubjectAdmin(data: {
  name: string;
  code: string;
  departmentId: string;
  semester: number;
  university: string;
}) {
  await requireAdmin();

  const subject = await prisma.subject.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      departmentId: data.departmentId,
      semester: data.semester,
      university: data.university,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return subject;
}

/**
 * Update a subject (Admin only)
 */
export async function updateSubjectAdmin(
  id: string,
  data: {
    name?: string;
    code?: string;
    semester?: number;
    batchId?: string | null;
    isActive?: boolean;
  }
) {
  await requireAdmin();

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.code && { code: data.code.toUpperCase() }),
      ...(data.semester && { semester: data.semester }),
      ...('batchId' in data && { batchId: data.batchId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return subject;
}

/**
 * Delete a subject (Admin only)
 * Soft delete by setting isActive to false
 */
export async function deleteSubjectAdmin(id: string, hardDelete = false) {
  await requireAdmin();

  if (hardDelete) {
    // Check if there are resources
    const resourceCount = await prisma.resource.count({
      where: { subjectId: id },
    });

    if (resourceCount > 0) {
      throw new Error(
        `Cannot delete subject with ${resourceCount} resources. Delete resources first or use soft delete.`
      );
    }

    await prisma.subject.delete({
      where: { id },
    });
  } else {
    // Soft delete
    await prisma.subject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return { success: true };
}

/**
 * Toggle subject active status (Admin only)
 */
export async function toggleSubjectStatus(id: string) {
  await requireAdmin();

  const subject = await prisma.subject.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!subject) {
    throw new Error("Subject not found");
  }

  const updated = await prisma.subject.update({
    where: { id },
    data: { isActive: !subject.isActive },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return updated;
}

/**
 * Bulk create subjects for a semester (Admin only)
 */
export async function bulkCreateSubjects(
  subjects: Array<{
    name: string;
    code: string;
    departmentId: string;
    semester: number;
    university: string;
  }>
) {
  await requireAdmin();

  const results = await prisma.subject.createMany({
    data: subjects.map(s => ({
      name: s.name,
      code: s.code.toUpperCase(),
      departmentId: s.departmentId,
      semester: s.semester,
      university: s.university,
    })),
    skipDuplicates: true,
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return results;
}
