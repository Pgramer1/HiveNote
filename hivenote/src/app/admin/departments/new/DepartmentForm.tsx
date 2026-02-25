"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDepartment } from "@/actions/admin-departments";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

export default function DepartmentForm({ universities }: { universities: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    university: universities[0]?.name || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createDepartment(formData);
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create department");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="university" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          University
        </label>
        <select
          id="university"
          required
          value={formData.university}
          onChange={(e) => setFormData({ ...formData, university: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
        >
          {universities.map((uni) => (
            <option key={uni.id} value={uni.name}>
              {uni.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Department Code
        </label>
        <input
          type="text"
          id="code"
          required
          placeholder="e.g., CSE, ICT, CIE"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white font-mono"
          maxLength={10}
        />
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Short code like CSE, ICT, etc.
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Department Name
        </label>
        <input
          type="text"
          id="name"
          required
          placeholder="e.g., Computer Science & Engineering"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          placeholder="Brief description of this department"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          rows={3}
        />
      </div>

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Department'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
