import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type PageProps = {
  searchParams: Promise<{ department?: string; batch?: string; semester?: string }>;
};

export default async function NewSubjectPage({ searchParams }: PageProps) {
  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, university: true },
  });

  if (currentUser?.role !== 'ADMIN') {
    redirect("/");
  }

  const { department, batch, semester } = await searchParams;

  async function createSubject(formData: FormData) {
    'use server';
    
    const session = await getSession();
    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, university: true },
    });

    if (user?.role !== 'ADMIN') {
      throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const dept = formData.get("department") as string;
    const sem = parseInt(formData.get("semester") as string);

    await prisma.subject.create({
      data: {
        name,
        code: code.toUpperCase(),
        department: dept as any,
        semester: sem,
        university: user.university!,
      },
    });

    redirect(`/university/${dept.toLowerCase()}/${formData.get("batch")}/${sem}`);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <Link
          href={department && batch && semester ? `/university/${department.toLowerCase()}/${batch}/${semester}` : "/university"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Add New Subject</h1>
        <p className="text-muted-foreground mb-8">Create a new subject for your university department</p>

        <form action={createSubject} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Subject Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="e.g., Data Structures and Algorithms"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              Subject Code *
            </label>
            <input
              type="text"
              id="code"
              name="code"
              required
              placeholder="e.g., CS201"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary uppercase"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium mb-2">
              Department *
            </label>
            <select
              id="department"
              name="department"
              required
              defaultValue={department || ""}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Select department</option>
              <option value="CSE">CSE - Computer Science & Engineering</option>
              <option value="ICT">ICT - Information & Communication Technology</option>
              <option value="CIE">CIE - Computer & Internet Engineering</option>
            </select>
          </div>

          <div>
            <label htmlFor="batch" className="block text-sm font-medium mb-2">
              Batch *
            </label>
            <input
              type="text"
              id="batch"
              name="batch"
              required
              defaultValue={batch || ""}
              placeholder="e.g., 28"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="semester" className="block text-sm font-medium mb-2">
              Semester *
            </label>
            <select
              id="semester"
              name="semester"
              required
              defaultValue={semester || ""}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Select semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Create Subject
            </button>
            <Link
              href={department && batch && semester ? `/university/${department.toLowerCase()}/${batch}/${semester}` : "/university"}
              className="px-6 py-2 rounded-lg font-medium border hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
