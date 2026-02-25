"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBatch } from "@/actions/admin-batches";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

interface Department {
  id: string;
  code: string;
  name: string;
  university: string;
}

export default function BatchForm({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    years: "",
    departmentId: departments[0]?.id || "",
  });

  const selectedDepartment = departments.find(d => d.id === formData.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!selectedDepartment) {
      setError("Please select a department");
      setLoading(false);
      return;
    }

    try {
      await createBatch({
        ...formData,
        university: selectedDepartment.university,
      });
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create batch");
      setLoading(false);
    }
  };

  // Auto-fill years based on batch code
  const handleCodeChange = (code: string) => {
    setFormData({ ...formData, code });
    
    // Auto-calculate years if code is 2 digits
    if (code.length === 2 && !isNaN(Number(code))) {
      const startYear = 2000 + parseInt(code);
      const endYear = startYear + 4;
      setFormData({ ...formData, code, years: `${startYear}-${endYear}` });
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
        <label htmlFor="department" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Department
        </label>
        <select
          id="department"
          required
          value={formData.departmentId}
          onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
        >
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.code} - {dept.name} ({dept.university})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Batch Code
        </label>
        <input
          type="text"
          id="code"
          required
          placeholder="e.g., 28 for 2024-2028"
          value={formData.code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white font-mono"
          maxLength={3}
        />
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Usually last 2 digits of graduation year (e.g., 28 for 2028)
        </p>
      </div>

      <div>
        <label htmlFor="years" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Year Range
        </label>
        <input
          type="text"
          id="years"
          required
          placeholder="e.g., 2024-2028"
          value={formData.years}
          onChange={(e) => setFormData({ ...formData, years: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
        />
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Format: YYYY-YYYY (start year - end year)
        </p>
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
            'Create Batch'
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
