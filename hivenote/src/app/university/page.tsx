import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GraduationCap, BookOpen } from "lucide-react";
import { getUniversityById, detectUniversityFromEmail } from "@/lib/universities";

export default async function UniversityLandingPage() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true, 
      name: true,
      isUniversityEmail: true,
      university: true,
      department: true,
      batch: true,
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

  // Get university configuration
  const universityConfig = getUniversityById(user.university!.toLowerCase().replace(/\s+/g, '-')) || 
                          getUniversityById('adani'); // fallback
  
  if (!universityConfig) {
    redirect("/");
  }

  const departments = universityConfig.departments.map((dept, index) => {
    const colors = [
      "bg-blue-500/10 border-blue-200/50 hover:border-blue-500/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400",
      "bg-purple-500/10 border-purple-200/50 hover:border-purple-500/50 text-purple-600 dark:border-purple-500/20 dark:text-purple-400",
      "bg-emerald-500/10 border-emerald-200/50 hover:border-emerald-500/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400",
    ];
    return {
      ...dept,
      color: colors[index % colors.length]
    };
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="w-12 h-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{universityConfig.displayName}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Welcome, {user.name}! Select your department to access resources.
          </p>
        </div>

        {/* Department Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Link
              key={dept.code}
              href={`/university/${dept.code.toLowerCase()}`}
              className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${dept.color}`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-xl bg-background/50 border flex items-center justify-center">
                  <BookOpen className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">{dept.code}</h2>
                  <h3 className="text-sm font-semibold mb-1">{dept.name}</h3>
                  <p className="text-xs opacity-75">{dept.description}</p>
                </div>
                <div className="pt-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to explore →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Access */}
        {user.department && user.batch && (
          <div className="mt-12 p-6 bg-muted/30 rounded-xl border">
            <p className="text-sm text-muted-foreground mb-3">Quick Access:</p>
            <Link
              href={`/university/${user.department.toLowerCase()}/${user.batch}`}
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <BookOpen className="w-4 h-4" />
              Go to {user.department} - Batch {user.batch}'
            </Link>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <Link
            href="/resources"
            className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
          >
            Browse all resources →
          </Link>
        </div>
      </div>
    </div>
  );
}
