"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Get all batches for a university/department
 */
export async function getBatches(filters?: {
  university?: string;
  departmentId?: string;
}) {
  return await prisma.batchConfig.findMany({
    where: {
      ...(filters?.university && { university: filters.university }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
    },
    include: {
      department: true,
    },
    orderBy: { code: 'desc' }, // Latest batches first
  });
}

/**
 * Get a single batch by ID
 */
export async function getBatch(id: string) {
  return await prisma.batchConfig.findUnique({
    where: { id },
    include: {
      department: true,
    },
  });
}

/**
 * Create a new batch (admin only)
 */
export async function createBatch(data: {
  code: string;
  years: string;
  university: string;
  departmentId: string;
}) {
  await requireAdmin();

  const batch = await prisma.batchConfig.create({
    data: {
      code: data.code,
      years: data.years,
      university: data.university,
      departmentId: data.departmentId,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return batch;
}

/**
 * Update a batch (admin only)
 */
export async function updateBatch(
  id: string,
  data: {
    code?: string;
    years?: string;
    isActive?: boolean;
  }
) {
  await requireAdmin();

  const batch = await prisma.batchConfig.update({
    where: { id },
    data: {
      ...(data.code && { code: data.code }),
      ...(data.years && { years: data.years }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return batch;
}

/**
 * Delete a batch (admin only)
 */
export async function deleteBatch(id: string) {
  await requireAdmin();

  await prisma.batchConfig.delete({
    where: { id },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return { success: true };
}

/**
 * Toggle batch active status (admin only)
 */
export async function toggleBatchStatus(id: string) {
  await requireAdmin();

  const batch = await prisma.batchConfig.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const updated = await prisma.batchConfig.update({
    where: { id },
    data: { isActive: !batch.isActive },
  });

  revalidatePath('/admin');
  revalidatePath('/university');
  
  return updated;
}

/**
 * Get batches for a specific department
 */
export async function getDepartmentBatches(departmentId: string) {
  return await prisma.batchConfig.findMany({
    where: { departmentId },
    orderBy: { code: 'desc' },
  });
}
