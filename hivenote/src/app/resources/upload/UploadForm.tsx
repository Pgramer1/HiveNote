"use client";

import { useState, useTransition } from "react";
import { createResource } from "./actions";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const [resourceType, setResourceType] = useState<"PDF" | "LINK">("PDF");
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await createResource(formData);
        showToast("Resource uploaded successfully!", "success");
        router.push("/resources");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Failed to upload resource", "error");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-2 dark:text-white">
          Resource Title *
        </label>
        <input
          name="title"
          placeholder="e.g., Data Structures Notes"
          required
          className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition bg-white dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 dark:text-white">
          Description
        </label>
        <textarea
          name="description"
          placeholder="Brief description of the resource (optional)"
          rows={3}
          className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition bg-white dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 dark:text-white">
          Resource Type *
        </label>
        <select
          name="type"
          required
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value as "PDF" | "LINK")}
          className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
        >
          <option value="PDF">📄 PDF</option>
          <option value="LINK">🔗 Link</option>
        </select>
      </div>

      {resourceType === "PDF" ? (
        <div>
          <label className="block text-sm font-semibold mb-2 dark:text-white">
            Upload PDF File *
          </label>
          <input
            type="file"
            name="file"
            accept=".pdf"
            required
            className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg bg-white dark:bg-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 file:cursor-pointer hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-semibold mb-2 dark:text-white">
            External Link URL *
          </label>
          <input
            type="url"
            name="link"
            placeholder="https://example.com/resource"
            required
            className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition bg-white dark:bg-gray-900 dark:text-white"
          />
        </div>
      )}

      <button 
        disabled={isPending}
        className="w-full bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-semibold text-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Uploading..." : "Upload Resource"}
      </button>
    </form>
  );
}
