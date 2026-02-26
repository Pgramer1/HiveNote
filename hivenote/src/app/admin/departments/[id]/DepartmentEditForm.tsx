"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDepartment, deleteDepartment, toggleDepartmentStatus } from "@/actions/admin-departments";
import { Button } from "@/components/ui/Button";
import { Loader2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export default function DepartmentEditForm({ department }: { department: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    code: department.code,
    name: department.name,
    description: department.description || "",
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await updateDepartment(department.id, formData);
      setSuccess("Department updated successfully.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update department");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    setError("");
    setSuccess("");
    try {
      await toggleDepartmentStatus(department.id);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to toggle status");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    const batchCount = department.batches?.length ?? 0;
    const subjectCount = department.subjects?.length ?? 0;
    const warn = batchCount > 0 || subjectCount > 0
      ? ` This will also delete ${batchCount} batch(es) and ${subjectCount} subject(s).`
      : "";
    if (!confirm(`Are you sure you want to delete this department?${warn}`)) return;
    setDeleting(true);
    setError("");
    try {
      await deleteDepartment(department.id);
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete department");
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
            Department Code
          </label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white font-mono"
            maxLength={10}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Department Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
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
          {toggling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : department.isActive ? <ToggleRight className="w-4 h-4 mr-2 text-green-500" /> : <ToggleLeft className="w-4 h-4 mr-2 text-slate-400" />}
          {department.isActive ? 'Deactivate' : 'Activate'}
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
