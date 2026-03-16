import { requireAdmin } from "@/lib/permissions";
import { getSubjectAdmin } from "@/actions/admin-subjects";
import { getDepartmentBatches } from "@/actions/admin-batches";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SubjectEditForm from "./SubjectEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SubjectDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const subject = await getSubjectAdmin(id);

  if (!subject) {
    notFound();
  }

  // Load batches for the subject's department (if set)
  const batches = subject.departmentId
    ? await getDepartmentBatches(subject.departmentId)
    : [];

  const deptCode = (subject as any).departmentConfig?.code || (subject as any).department || 'N/A';
  const deptName = (subject as any).departmentConfig?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Dashboard
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-2xl font-bold text-purple-600 dark:text-purple-400">
                {subject.code}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                subject.isActive
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {subject.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{subject.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {deptCode}{deptName ? ` · ${deptName}` : ''}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                Semester {subject.semester}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {(subject as any)._count?.resources || 0} resources
              </span>
            </div>
          </div>

          <SubjectEditForm subject={subject} batches={batches} />
        </div>
      </div>
    </div>
  );
}
