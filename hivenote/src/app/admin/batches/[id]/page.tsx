import { requireAdmin } from "@/lib/permissions";
import { getBatch } from "@/actions/admin-batches";
import { getDepartments } from "@/actions/admin-departments";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BatchEditForm from "./BatchEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BatchDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const [batch, departments] = await Promise.all([
    getBatch(id),
    getDepartments(),
  ]);

  if (!batch) {
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
              <span className="font-mono text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                Batch {batch.code}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                batch.isActive
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {batch.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{batch.years}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {(batch as any).department?.name || 'Unknown Department'}
            </p>
          </div>

          <BatchEditForm batch={batch} departments={departments} />
        </div>
      </div>
    </div>
  );
}
