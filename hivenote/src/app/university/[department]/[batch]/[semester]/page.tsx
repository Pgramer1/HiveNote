import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GraduationCap, ArrowLeft, FolderOpen, Sparkles, Plus } from "lucide-react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { getUniversityById, detectUniversityFromEmail } from "@/lib/universities";

type PageProps = {
  params: Promise<{ department: string; batch: string; semester: string }>;
};

export default async function SemesterSubjectsPage({ params }: PageProps) {
  const { department: deptSlug, batch, semester: semesterStr } = await params;
  
  const semester = parseInt(semesterStr);
  if (isNaN(semester) || semester < 1 || semester > 8) {
    notFound();
  }

  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  let currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true,
      isUniversityEmail: true,
      university: true,
      name: true,
      role: true,
    },
  });

  if (!currentUser?.isUniversityEmail) {
    redirect("/");
  }

  // If university field is not set, detect and update it
  if (!currentUser.university) {
    const detectedUniversity = detectUniversityFromEmail(session.user.email);
    if (detectedUniversity) {
      await prisma.user.update({
        where: { email: session.user.email },
        data: { university: detectedUniversity.name }
      });
      currentUser = { ...currentUser, university: detectedUniversity.name };
    } else {
      redirect("/");
    }
  }

  // Get university configuration
  const universityConfig = getUniversityById(currentUser.university!.toLowerCase().replace(/\s+/g, '-')) || 
                          getUniversityById('adani');
  
  if (!universityConfig) {
    redirect("/");
  }

  // Find department in university config
  const department = universityConfig.departments.find(
    d => d.code.toLowerCase() === deptSlug.toLowerCase()
  );
  
  if (!department) {
    notFound();
  }

  // Fetch subjects for this semester, department, and university
  const subjects = await prisma.subject.findMany({
    where: {
      university: currentUser.university!, // Guaranteed non-null by checks above
      department: department.code as any,
      semester,
    },
    include: {
      _count: {
        select: {
          resources: true,
        },
      },
    },
    orderBy: {
      code: 'asc',
    },
  });

  const subjectColors = [
    { bg: 'bg-red-900/50', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-500' },
    { bg: 'bg-orange-900/50', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-500' },
    { bg: 'bg-yellow-900/50', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-500' },
    { bg: 'bg-green-900/50', border: 'border-green-500/30', text: 'text-green-400', icon: 'text-green-500' },
    { bg: 'bg-teal-900/50', border: 'border-teal-500/30', text: 'text-teal-400', icon: 'text-teal-500' },
    { bg: 'bg-blue-900/50', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-500' },
    { bg: 'bg-indigo-900/50', border: 'border-indigo-500/30', text: 'text-indigo-400', icon: 'text-indigo-500' },
    { bg: 'bg-purple-900/50', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'text-purple-500' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Breadcrumbs 
          items={[
            { label: "University", href: "/university" },
            { label: department.code, href: `/university/${deptSlug}` },
            { label: `Batch ${batch}'`, href: `/university/${deptSlug}/${batch}` },
            { label: `Semester ${semester}` }
          ]} 
        />

        {/* Header */}
        <div className="mt-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              {department.code} - Batch {batch}' - Semester {semester}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Select a subject to view resources</p>
        </div>

        {/* Subject Folders */}
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-xl border border-dashed text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No subjects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {currentUser.role === 'ADMIN' ? 'Add subjects to get started!' : 'Subjects will appear here soon.'}
            </p>
            {currentUser.role === 'ADMIN' && (
              <Link
                href={`/admin/subjects/new?department=${department.code}&batch=${batch}&semester=${semester}`}
                className="inline-flex h-9 items-center gap-2 justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Subject
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {subjects.map((subject: any, index: number) => {
              const colorScheme = subjectColors[index % subjectColors.length];
              
              return (
                <Link
                  key={subject.id}
                  href={`/university/${deptSlug}/${batch}/${semester}/${subject.code.toLowerCase()}`}
                  className={`group relative bg-gradient-to-br from-background to-muted border-2 ${colorScheme.border} rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 hover:shadow-xl`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`shrink-0 w-14 h-14 ${colorScheme.bg} border ${colorScheme.border} rounded-xl flex items-center justify-center shadow-sm`}>
                      <FolderOpen className={`w-7 h-7 ${colorScheme.icon}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-xl font-bold ${colorScheme.text} mb-1`}>{subject.code}</div>
                      <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-2">
                        {subject.name}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {subject._count.resources} {subject._count.resources === 1 ? 'resource' : 'resources'}
                      </div>
                    </div>
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={`w-8 h-8 ${colorScheme.bg} border ${colorScheme.border} rounded-full flex items-center justify-center`}>
                      <svg className={`w-4 h-4 ${colorScheme.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Admin Add Button */}
        {currentUser.role === 'ADMIN' && subjects.length > 0 && (
          <div className="mt-6 text-center">
            <Link
              href={`/admin/subjects/new?department=${department.code}&batch=${batch}&semester=${semester}`}
              className="inline-flex h-9 items-center gap-2 justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Another Subject
            </Link>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-10">
          <Link
            href={`/university/${deptSlug}/${batch}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to semesters
          </Link>
        </div>
      </div>
    </div>
  );
}
