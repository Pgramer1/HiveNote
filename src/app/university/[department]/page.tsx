import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GraduationCap, ArrowLeft, Calendar } from "lucide-react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { detectUniversityFromEmail } from "@/lib/universities";

const BATCH_COLORS = [
  "bg-blue-500/10 border-blue-200/50 hover:border-blue-500/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400",
  "bg-purple-500/10 border-purple-200/50 hover:border-purple-500/50 text-purple-600 dark:border-purple-500/20 dark:text-purple-400",
  "bg-emerald-500/10 border-emerald-200/50 hover:border-emerald-500/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400",
  "bg-orange-500/10 border-orange-200/50 hover:border-orange-500/50 text-orange-600 dark:border-orange-500/20 dark:text-orange-400",
  "bg-rose-500/10 border-rose-200/50 hover:border-rose-500/50 text-rose-600 dark:border-rose-500/20 dark:text-rose-400",
  "bg-teal-500/10 border-teal-200/50 hover:border-teal-500/50 text-teal-600 dark:border-teal-500/20 dark:text-teal-400",
];

type PageProps = {
  params: Promise<{ department: string }>;
};

export default async function DepartmentPage({ params }: PageProps) {
  const { department: deptSlug } = await params;
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

  // Fetch active batches for this department from the database
  const batches = await prisma.batchConfig.findMany({
    where: { departmentId: department.id, isActive: true },
    orderBy: { code: 'desc' },
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Breadcrumbs 
          items={[
            { label: "University", href: "/university" },
            { label: department.code }
          ]} 
        />

        {/* Header */}
        <div className="mb-12 mt-6">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {department.code}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">{department.name}</p>
          <p className="text-sm text-muted-foreground mt-2">Select your batch to continue</p>
        </div>

        {/* Batch Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {batches.length === 0 && (
            <p className="col-span-2 text-center text-muted-foreground py-12">
              No batches available yet. Please check back later.
            </p>
          )}
          {batches.map((batch, index) => (
            <Link
              key={batch.code}
              href={`/university/${deptSlug}/${batch.code}`}
              className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${BATCH_COLORS[index % BATCH_COLORS.length]}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-xl bg-background/50 border flex items-center justify-center">
                    <div className="text-4xl font-bold">{batch.code}'</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold mb-1">Batch {batch.code}'</div>
                    <div className="text-sm opacity-75">{batch.years}</div>
                    <div className="mt-3 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View semesters →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Back Link */}
        <div className="mt-12">
          <Link
            href="/university"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to departments
          </Link>
        </div>
      </div>
    </div>
  );
}
