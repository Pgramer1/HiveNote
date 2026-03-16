"use client";

import { useState, useTransition } from "react";
import { createResource } from "@/actions/resources";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter, useSearchParams } from "next/navigation";

type UploadFormProps = {
  user: {
    isUniversityEmail: boolean;
    department: string | null;
    batch: string | null;
    university: string | null;
  } | null;
  subjects?: Array<{ id: string; name: string; code: string }>;
};

export default function UploadForm({ user, subjects = [] }: UploadFormProps) {
  const [resourceType, setResourceType] = useState<"PDF" | "PPT" | "LINK">("PDF");
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from URL params if coming from university pages
  const defaultDepartment = searchParams.get("department") || user?.department || "";
  const defaultBatch = searchParams.get("batch") || user?.batch || "";
  const defaultSemester = searchParams.get("semester") || "";
  const defaultSubject = searchParams.get("subject") || "";

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await createResource(formData);
        showToast("Resource uploaded successfully!", "success");
        
        // Redirect back to subject page if they came from there
        const dept = formData.get("department");
        const batch = formData.get("batch");
        const semester = formData.get("semester");
        const subjectId = formData.get("subject");
        
        if (dept && batch && semester && subjectId && subjects.length > 0) {
          const subject = subjects.find(s => s.id === subjectId);
          if (subject) {
            router.push(`/university/${dept.toString().toLowerCase()}/${batch}/${semester}/${subject.code.toLowerCase()}`);
            return;
          }
        }
        
        if (dept && batch && semester) {
          router.push(`/university/${dept.toString().toLowerCase()}/${batch}/${semester}`);
        } else if (user?.isUniversityEmail) {
          router.push("/university");
        } else {
          router.push("/");
        }
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
          onChange={(e) => setResourceType(e.target.value as "PDF" | "PPT" | "LINK")}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="PDF">📄 PDF</option>
          <option value="PPT">📊 PowerPoint (PPT/PPTX)</option>
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
      ) : resourceType === "PPT" ? (
        <div>
          <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">
            Upload PowerPoint File *
          </label>
          <input
            type="file"
            name="file"
            accept=".ppt,.pptx"
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

      {/* University-specific fields */}
      {user?.isUniversityEmail && (
        <>
          {/* Hidden field for university */}
          <input type="hidden" name="university" value={user.university || ""} />
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium leading-none mb-2">
                Department *
              </label>
              <select
                name="department"
                defaultValue={defaultDepartment}
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select</option>
                <option value="CSE">CSE</option>
                <option value="ICT">ICT</option>
                <option value="CIE">CIE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium leading-none mb-2">
                Batch *
              </label>
              <select
                name="batch"
                defaultValue={defaultBatch}
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select</option>
                <option value="28">28' (2024-2028)</option>
                <option value="27">27' (2023-2027)</option>
                <option value="26">26' (2022-2026)</option>
                <option value="25">25' (2021-2025)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium leading-none mb-2">
                Semester *
              </label>
              <select
                name="semester"
                defaultValue={defaultSemester}
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Selection - only shown if subjects are available */}
          {subjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium leading-none mb-2">
                Subject *
              </label>
              <select
                name="subject"
                defaultValue={defaultSubject}
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
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
