import { requireAdmin } from "@/lib/permissions";
import { getDepartment } from "@/actions/admin-departments";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DepartmentEditForm from "./DepartmentEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DepartmentDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const department = await getDepartment(id);

  if (!department) {
    notFound();
  }

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
              <span className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
                {department.code}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                department.isActive
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {department.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{department.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {(department as any)._count?.batches ?? department.batches?.length ?? 0} batches &bull;{" "}
              {(department as any)._count?.subjects ?? department.subjects?.length ?? 0} subjects
            </p>
          </div>

          <DepartmentEditForm department={department} />
        </div>
      </div>
    </div>
  );
}
