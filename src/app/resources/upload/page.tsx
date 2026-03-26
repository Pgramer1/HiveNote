import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UploadForm from "./UploadForm";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export const runtime = "nodejs";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; semester?: string; subject?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: {
      isUniversityEmail: true,
      department: true,
      batch: true,
      university: true,
    },
  });

  await searchParams;
  
  // Always fetch university subjects so navbar uploads can still choose a subject.
  let subjects: Array<{ id: string; name: string; code: string; department: string | null; semester: number }> = [];
  if (user?.isUniversityEmail && user.university) {
    subjects = await prisma.subject.findMany({
      where: {
        university: user.university,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        department: true,
        semester: true,
      },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    });
  }

  const breadcrumbItems = user?.isUniversityEmail 
    ? [{ label: "My University", href: "/university" }, { label: "Upload" }]
    : [{ label: "Upload" }];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <Breadcrumbs items={breadcrumbItems} />
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-8 mt-6">Upload Resource</h1>
        <div className="bg-card p-6 md:p-8 rounded-xl border shadow-sm">
          <UploadForm user={user} subjects={subjects} />
        </div>
      </div>
    </div>
  );
}
