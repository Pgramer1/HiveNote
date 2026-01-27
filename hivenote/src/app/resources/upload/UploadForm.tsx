"use client";

import { useState, useTransition } from "react";
import { createResource } from "@/actions/resources";
import { useToast } from "@/components/ui/ToastProvider";
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
        <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">
          Resource Title *
        </label>
        <input
          name="title"
          placeholder="e.g., Data Structures Notes"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">
          Description
        </label>
        <textarea
          name="description"
          placeholder="Brief description of the resource (optional)"
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">
          Resource Type *
        </label>
        <select
          name="type"
          required
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value as "PDF" | "LINK")}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="PDF">📄 PDF</option>
          <option value="LINK">🔗 Link</option>
        </select>
      </div>

      {resourceType === "PDF" ? (
        <div>
          <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">
            Upload PDF File *
          </label>
          <input
            type="file"
            name="file"
            accept=".pdf"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">
            External Link URL *
          </label>
          <input
            type="url"
            name="link"
            placeholder="https://example.com/resource"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      )}

      <button 
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-4"
      >
        {isPending ? "Uploading..." : "Upload Resource"}
      </button>
    </form>
  );
}
