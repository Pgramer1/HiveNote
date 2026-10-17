"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createResource, getResourceUploadSignature } from "@/actions/resources";
import { MAX_RESOURCE_BYTES } from "@/lib/upload-limits";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter, useSearchParams } from "next/navigation";

type UploadFormProps = {
  user: {
    isUniversityEmail: boolean;
    department: string | null;
    batch: string | null;
    university: string | null;
  } | null;
  subjects?: Array<{ id: string; name: string; code: string; department: string | null; semester: number }>;
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

  const [selectedDepartment, setSelectedDepartment] = useState(defaultDepartment);
  const [selectedSemester, setSelectedSemester] = useState(defaultSemester);
  const [selectedSubject, setSelectedSubject] = useState(defaultSubject);

  const filteredSubjects = useMemo(() => {
    if (!selectedDepartment || !selectedSemester) return [];
    const semesterNumber = Number.parseInt(selectedSemester, 10);
    if (Number.isNaN(semesterNumber)) return [];

    return subjects.filter(
      (subject) =>
        (subject.department || "").toUpperCase() === selectedDepartment.toUpperCase() &&
        subject.semester === semesterNumber
    );
  }, [subjects, selectedDepartment, selectedSemester]);

  useEffect(() => {
    if (!selectedSubject) return;
    const isStillValid = filteredSubjects.some((subject) => subject.id === selectedSubject);
    if (!isStillValid) {
      setSelectedSubject("");
    }
  }, [filteredSubjects, selectedSubject]);

  // Sends the file straight to Cloudinary: Vercel rejects function request bodies over
  // 4.5 MB, so files can't go through the server action. Returns an error message or null.
  const uploadFileDirectly = async (formData: FormData): Promise<string | null> => {
    const type = formData.get("type");
    const file = formData.get("file");
    formData.delete("file");
    if (type !== "PDF" && type !== "PPT") return null;
    if (!(file instanceof File) || file.size === 0) return "Please choose a file to upload.";
    if (file.size > MAX_RESOURCE_BYTES) {
      return `Files can be at most ${MAX_RESOURCE_BYTES / (1024 * 1024)} MB.`;
    }

    const sig = await getResourceUploadSignature({ type, fileName: file.name, fileSize: file.size });
    if (!sig.success) return sig.error;

    const body = new FormData();
    // Cloudinary appends the uploaded file name's extension to raw public ids, and the
    // account blocks .pdf URLs, so send the file under the extension-less id we signed.
    body.append("file", file, sig.publicId);
    body.append("api_key", sig.apiKey);
    body.append("timestamp", String(sig.timestamp));
    body.append("signature", sig.signature);
    body.append("folder", sig.folder);
    body.append("public_id", sig.publicId);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`, {
      method: "POST",
      body,
    });
    const json = (await res.json().catch(() => null)) as { public_id?: string; error?: { message?: string } } | null;
    if (!res.ok || !json?.public_id) {
      return json?.error?.message ? `Upload failed: ${json.error.message}` : "Upload failed. Please try again.";
    }

    formData.set("uploadedPublicId", json.public_id);
    return null;
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const uploadError = await uploadFileDirectly(formData);
        if (uploadError) {
          showToast(uploadError, "error");
          return;
        }

        const result = await createResource(formData);
        if (!result.success) {
          showToast(result.error, "error");
          return;
        }
        showToast("Resource uploaded successfully!", "success");
        
        // Redirect back to subject page if they came from there
        const dept = formData.get("department");
        const batch = formData.get("batch");
        const semester = formData.get("semester");
        const subjectId = formData.get("subject");
        
        if (dept && batch && semester && subjectId && filteredSubjects.length > 0) {
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
          <p className="mt-1 text-xs text-muted-foreground">Up to {MAX_RESOURCE_BYTES / (1024 * 1024)} MB</p>
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
          <p className="mt-1 text-xs text-muted-foreground">Up to {MAX_RESOURCE_BYTES / (1024 * 1024)} MB</p>
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
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
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
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
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

          <div>
            <label className="block text-sm font-medium leading-none mb-2">
              Subject *
            </label>
            <select
              name="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              required
              disabled={!selectedDepartment || !selectedSemester || filteredSubjects.length === 0}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="">
                {!selectedDepartment || !selectedSemester
                  ? "Select department and semester first"
                  : filteredSubjects.length === 0
                    ? "No subjects found"
                    : "Select subject"}
              </option>
              {filteredSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>
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
