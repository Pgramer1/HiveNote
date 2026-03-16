import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GraduationCap, ArrowLeft, FolderOpen } from "lucide-react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { detectUniversityFromEmail } from "@/lib/universities";

const semesters = [
  { num: 1, color: "bg-red-500/10 border-red-200/50 hover:border-red-500/50 text-red-600 dark:border-red-500/20 dark:text-red-400" },
  { num: 2, color: "bg-orange-500/10 border-orange-200/50 hover:border-orange-500/50 text-orange-600 dark:border-orange-500/20 dark:text-orange-400" },
  { num: 3, color: "bg-amber-500/10 border-amber-200/50 hover:border-amber-500/50 text-amber-600 dark:border-amber-500/20 dark:text-amber-400" },
  { num: 4, color: "bg-lime-500/10 border-lime-200/50 hover:border-lime-500/50 text-lime-600 dark:border-lime-500/20 dark:text-lime-400" },
  { num: 5, color: "bg-emerald-500/10 border-emerald-200/50 hover:border-emerald-500/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400" },
  { num: 6, color: "bg-cyan-500/10 border-cyan-200/50 hover:border-cyan-500/50 text-cyan-600 dark:border-cyan-500/20 dark:text-cyan-400" },
  { num: 7, color: "bg-blue-500/10 border-blue-200/50 hover:border-blue-500/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400" },
  { num: 8, color: "bg-purple-500/10 border-purple-200/50 hover:border-purple-500/50 text-purple-600 dark:border-purple-500/20 dark:text-purple-400" },
];

type PageProps = {
  params: Promise<{ department: string; batch: string }>;
};

export default async function BatchPage({ params }: PageProps) {
  const { department: deptSlug, batch } = await params;
  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      isUniversityEmail: true,
      university: true,
      name: true,
    },
  });

  if (!user?.isUniversityEmail) {
    redirect("/");
  }

  // If university field is not set, detect and update it
  if (!user.university) {
    const detectedUniversity = detectUniversityFromEmail(session.user.email);
    if (detectedUniversity) {
      await prisma.user.update({
        where: { email: session.user.email },
        data: { university: detectedUniversity.name }
      });
      user = { ...user, university: detectedUniversity.name };
    } else {
      redirect("/");
    }
  }

  // Fetch department from the database
  const department = await prisma.departmentConfig.findFirst({
    where: {
      code: { equals: deptSlug, mode: 'insensitive' },
      university: user.university!,
      isActive: true,
    },
  });

  if (!department) {
    notFound();
  }

  // Get resource count for each semester (filtered by university)
  const resourceCounts = await Promise.all(
    semesters.map(async (sem) => {
      const count = await prisma.resource.count({
        where: {
          university: user.university,
          department: department.code as any,
          batch,
          semester: sem.num,
        },
      });
      return { semester: sem.num, count };
    })
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-6xl">
        <Breadcrumbs 
          items={[
            { label: "University", href: "/university" },
            { label: department.code, href: `/university/${deptSlug}` },
            { label: `Batch ${batch}'` }
          ]} 
        />

        {/* Header */}
        <div className="mb-12 mt-6">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {department.code} - Batch {batch}'
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">{department.name}</p>
          <p className="text-sm text-muted-foreground mt-2">Select a semester to view resources</p>
        </div>

        {/* Semester Folders */}
        <div className="grid md:grid-cols-4 gap-4">
          {semesters.map((sem) => {
            const resourceCount = resourceCounts.find(rc => rc.semester === sem.num)?.count || 0;
            return (
              <Link
                key={sem.num}
                href={`/university/${deptSlug}/${batch}/${sem.num}`}
                className={`group relative p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${sem.color}`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-lg bg-background/50 border flex items-center justify-center">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">Semester {sem.num}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {resourceCount} {resourceCount === 1 ? 'resource' : 'resources'}
                    </div>
                  </div>
                  <div className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Back Link */}
        <div className="mt-12">
          <Link
            href={`/university/${deptSlug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to batches
          </Link>
        </div>
      </div>
    </div>
  );
}
