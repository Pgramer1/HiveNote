"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Create a new subject (Admin only)
 */
export async function createSubject(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const department = formData.get("department") as string;
  const semester = parseInt(formData.get("semester") as string);
  const university = formData.get("university") as string;

  if (!name || !code || !department || !semester || !university) {
    throw new Error("All fields are required");
  }

  try {
    await prisma.subject.create({
      data: {
        name,
        code: code.toUpperCase(),
        department,
        semester,
        university,
      },
    });

    revalidatePath("/admin/subjects");
    revalidatePath(`/university/${department.toLowerCase()}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating subject:", error);
    throw new Error("Failed to create subject");
  }
}

/**
 * Update an existing subject (Admin only)
 */
export async function updateSubject(id: string, formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;

  if (!name) {
    throw new Error("Name is required");
  }

  try {
    await prisma.subject.update({
      where: { id },
      data: { name },
    });

    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating subject:", error);
    throw new Error("Failed to update subject");
  }
}

/**
 * Delete a subject (Admin only)
 */
export async function deleteSubject(id: string) {
  await requireAdmin();

  try {
    // Check if there are any resources associated with this subject
    const resourceCount = await prisma.resource.count({
      where: { subjectId: id },
    });

    if (resourceCount > 0) {
      throw new Error(
        `Cannot delete subject with ${resourceCount} associated resources. Please delete or reassign resources first.`
      );
    }

    await prisma.subject.delete({
      where: { id },
    });

    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting subject:", error);
    throw error;
  }
}

/**
 * Get all subjects (optionally filtered)
 */
export async function getSubjects(filters?: {
  university?: string;
  department?: string;
  semester?: number;
}) {
  return await prisma.subject.findMany({
    where: filters,
    include: {
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
 * Seed default subjects for a semester (Admin only)
 */
export async function seedSubjectsForSemester(
  university: string,
  department: string,
  semester: number
) {
  await requireAdmin();

  const defaultSubjects = [
    { code: `${department}${semester}01`, name: "Mathematics" },
    { code: `${department}${semester}02`, name: "Programming Fundamentals" },
    { code: `${department}${semester}03`, name: "Data Structures" },
    { code: `${department}${semester}04`, name: "Database Management" },
    { code: `${department}${semester}05`, name: "Operating Systems" },
    { code: `${department}${semester}06`, name: "Computer Networks" },
  ];

  try {
    await prisma.subject.createMany({
      data: defaultSubjects.map((subject) => ({
        ...subject,
        department,
        semester,
        university,
      })),
      skipDuplicates: true,
    });

    revalidatePath("/admin/subjects");
    return { success: true, count: defaultSubjects.length };
  } catch (error: any) {
    console.error("Error seeding subjects:", error);
    throw new Error("Failed to seed subjects");
  }
}
