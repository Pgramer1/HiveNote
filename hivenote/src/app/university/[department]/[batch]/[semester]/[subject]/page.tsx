import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookOpen, ArrowLeft, FileText, Link2, Presentation, Sparkles, Upload } from "lucide-react";
import DeleteResourceButton from "@/components/features/DeleteResourceButton";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import VoteButtons from "@/components/features/VoteButtons";
import FavoriteButton from "@/components/features/FavoriteButton";
import SortSelector from "@/components/features/SortSelector";
import { calculateResourceScore, sortResources } from "@/utils/resources";
import type { ResourceSortOption } from "@/types";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";
import { getUniversityById, detectUniversityFromEmail } from "@/lib/universities";

type PageProps = {
  params: Promise<{ department: string; batch: string; semester: string; subject: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export default async function SubjectResourcesPage({ params, searchParams }: PageProps) {
  const { department: deptSlug, batch, semester: semesterStr, subject: subjectCode } = await params;
  const { sort = "new" } = await searchParams;
  
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

  // Find the subject
  const subject = await prisma.subject.findFirst({
    where: {
      code: {
        equals: subjectCode.toUpperCase(),
        mode: 'insensitive',
      },
      university: currentUser.university!,
      department: department.code as any,
      semester,
    },
  });

  if (!subject) {
    notFound();
  }

  // Fetch resources for this subject
  const resources = await prisma.resource.findMany({
    where: {
      subjectId: subject.id,
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
      votes: {
        select: { value: true, userId: true },
      },
      favorites: {
        where: { userId: currentUser.id },
        select: { id: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate scores and sort
  const resourcesWithScore = resources.map((resource: any) => 
    calculateResourceScore(resource, currentUser.id)
  );

  const sortedResources = sortResources(
    resourcesWithScore, 
    sort as ResourceSortOption
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Breadcrumbs 
          items={[
            { label: "University", href: "/university" },
            { label: department.code, href: `/university/${deptSlug}` },
            { label: `Batch ${batch}'`, href: `/university/${deptSlug}/${batch}` },
            { label: `Semester ${semester}`, href: `/university/${deptSlug}/${batch}/${semester}` },
            { label: subject.code }
          ]} 
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 mt-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">
                {subject.name}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {subject.code} • {department.code} - Batch {batch}' - Semester {semester}
            </p>
          </div>
          <Link
            href={`/resources/upload?department=${department.code}&batch=${batch}&semester=${semester}&subject=${subject.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Resource
          </Link>
        </div>

        {/* Sort Filter */}
        <SortSelector currentSort={sort} />

        {/* Resources List */}
        {sortedResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-xl border border-dashed text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No resources yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Be the first to upload a resource for {subject.name}!
            </p>
            <Link
              href={`/resources/upload?department=${department.code}&batch=${batch}&semester=${semester}&subject=${subject.id}`}
              className="inline-flex h-9 items-center gap-2 justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Resource
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedResources.map((resource) => (
              <div
                key={resource.id}
                className="group relative flex flex-col p-5 bg-card border rounded-xl hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Icon + Type Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${resource.type === 'PDF' ? 'bg-blue-500/10 border-blue-200/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400' : resource.type === 'PPT' ? 'bg-orange-500/10 border-orange-200/50 text-orange-600 dark:border-orange-500/20 dark:text-orange-400' : 'bg-emerald-500/10 border-emerald-200/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400'}`}>
                    {resource.type === 'PDF' ? (
                      <FileText className="w-7 h-7" />
                    ) : resource.type === 'PPT' ? (
                      <Presentation className="w-7 h-7" />
                    ) : (
                      <Link2 className="w-7 h-7" />
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${resource.type === 'PDF' ? 'bg-blue-500/10 border-blue-200/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400' : resource.type === 'PPT' ? 'bg-orange-500/10 border-orange-200/50 text-orange-600 dark:border-orange-500/20 dark:text-orange-400' : 'bg-emerald-500/10 border-emerald-200/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400'}`}>
                    {resource.type}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="flex-1 mb-4 space-y-1.5">
                  <Link
                    href={`/resources/${resource.id}`}
                    className="block group-hover:text-primary transition-colors"
                  >
                    <h3 className="text-base font-bold leading-snug tracking-tight line-clamp-2">
                      {resource.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {resource.description || "No description provided."}
                  </p>
                </div>

                {/* Footer: author + date */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-3">
                  <Link href={`/users/${resource.user.id}`} className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-background border">
                      <Image
                        src={getAvatarUrl(resource.user.name || "Anonymous")}
                        alt={resource.user.name || "Anonymous"}
                        width={16}
                        height={16}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {resource.user.name || "Anonymous"}
                  </Link>
                  <span className="text-muted-foreground/40">·</span>
                  <span>
                    {new Date(resource.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                  <VoteButtons resourceId={resource.id} score={resource.score} userVote={resource.userVote} isLoggedIn={true} />
                  <div className="flex-1" />
                  <FavoriteButton 
                    resourceId={resource.id} 
                    isFavorited={(resource as any).favorites?.length > 0} 
                    isLoggedIn={true} 
                  />
                  {currentUser.role === "ADMIN" && (
                    <DeleteResourceButton resourceId={resource.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-12">
          <Link
            href={`/university/${deptSlug}/${batch}/${semester}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to subjects
          </Link>
        </div>
      </div>
    </div>
  );
}
