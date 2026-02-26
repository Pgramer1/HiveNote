"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSubjectAdmin, deleteSubjectAdmin, toggleSubjectStatus } from "@/actions/admin-subjects";
import { Button } from "@/components/ui/Button";
import { Loader2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export default function SubjectEditForm({ subject, batches }: { subject: any; batches: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: subject.name,
    code: subject.code,
    semester: subject.semester,
    batchId: subject.batchConfig?.id || subject.batchId || "",
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await updateSubjectAdmin(subject.id, {
        name: formData.name,
        code: formData.code,
        semester: formData.semester,
        batchId: formData.batchId || null,
      });
      setSuccess("Subject updated successfully.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update subject");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    setError("");
    try {
      await toggleSubjectStatus(subject.id);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to toggle status");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    const resourceCount = subject._count?.resources || 0;
    const warn = resourceCount > 0
      ? ` It has ${resourceCount} resource(s). Hard delete not allowed; it will be deactivated instead.`
      : " This cannot be undone.";
    if (!confirm(`Are you sure you want to delete this subject?${warn}`)) return;
    setDeleting(true);
    setError("");
    try {
      await deleteSubjectAdmin(subject.id, resourceCount === 0);
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete subject");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Subject Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Subject Code
          </label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Department
          </label>
          <input
            type="text"
            disabled
            value={subject.departmentConfig?.name || subject.department || 'Unknown'}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Department cannot be changed after creation.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Batch
          </label>
          <select
            value={formData.batchId}
            onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="">— No specific batch (shared) —</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                Batch {batch.code} ({batch.years})
              </option>
            ))}
          </select>
          {batches.length === 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No batches found for this department.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Semester
          </label>
          <select
            required
            value={formData.semester}
            onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
        </Button>
      </form>

      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          type="button"
          variant="outline"
          onClick={handleToggle}
          disabled={toggling}
          className="flex-1"
        >
          {toggling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : subject.isActive ? <ToggleRight className="w-4 h-4 mr-2 text-green-500" /> : <ToggleLeft className="w-4 h-4 mr-2 text-slate-400" />}
          {subject.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Delete
        </Button>
      </div>
    </div>
  );
}
