import { requireAdmin } from "@/lib/permissions";
import { getDepartments } from "@/actions/admin-departments";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BatchForm from "./BatchForm";

export default async function NewBatchPage() {
  await requireAdmin();
  const departments = await getDepartments();

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-6">
            Create New Batch
          </h1>
          
          <BatchForm departments={departments} />
        </div>
      </div>
    </div>
  );
}
