"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBatch, deleteBatch, toggleBatchStatus } from "@/actions/admin-batches";
import { Button } from "@/components/ui/Button";
import { Loader2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export default function BatchEditForm({ batch, departments }: { batch: any; departments: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    code: batch.code,
    years: batch.years,
  });

  const handleCodeChange = (code: string) => {
    let years = formData.years;
    if (code.length === 2 && !isNaN(Number(code))) {
      const end = 2000 + parseInt(code);
      years = `${end - 4}-${end}`;
    }
    setFormData({ ...formData, code, years });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await updateBatch(batch.id, formData);
      setSuccess("Batch updated successfully.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update batch");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    setError("");
    try {
      await toggleBatchStatus(batch.id);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to toggle status");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this batch? This cannot be undone.")) return;
    setDeleting(true);
    setError("");
    try {
      await deleteBatch(batch.id);
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete batch");
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
            Department
          </label>
          <input
            type="text"
            disabled
            value={batch.department?.name || 'Unknown'}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Department cannot be changed after creation.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Batch Code
          </label>
          <input
            type="text"
            required
            maxLength={3}
            value={formData.code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Year Range
          </label>
          <input
            type="text"
            required
            placeholder="e.g., 2024-2028"
            value={formData.years}
            onChange={(e) => setFormData({ ...formData, years: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
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
          {toggling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : batch.isActive ? <ToggleRight className="w-4 h-4 mr-2 text-green-500" /> : <ToggleLeft className="w-4 h-4 mr-2 text-slate-400" />}
          {batch.isActive ? 'Deactivate' : 'Activate'}
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
