"use client";

import { useTransition } from "react";
import { updateProfile } from "@/actions/profile";

export default function EditProfileForm({ user }: { user: any }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <form
            className="bg-card p-6 md:p-8 rounded-xl border shadow-sm space-y-6"
            action={(formData) =>
            startTransition(() => updateProfile(formData))
            }
        >
            <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-2">Edit Profile</h1>
            <p className="text-muted-foreground mb-6">Update your personal information.</p>

            <div>
            <label htmlFor="name" className="block text-sm font-medium leading-none mb-2">
                Name
            </label>
            <input
                id="name"
                name="name"
                defaultValue={user.name ?? ""}
                placeholder="Your name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            </div>

            <div>
            <label htmlFor="bio" className="block text-sm font-medium leading-none mb-2">
                Bio
            </label>
            <textarea
                id="bio"
                name="bio"
                defaultValue={user.bio ?? ""}
                placeholder="Tell us about yourself..."
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            </div>

            {/* University-specific fields */}
            {user.isUniversityEmail && (
              <>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium leading-none mb-2">
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    defaultValue={user.department ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Department</option>
                    <option value="CSE">CSE - Computer Science & Engineering</option>
                    <option value="ICT">ICT - Information & Communication Technology</option>
                    <option value="CIE">CIE - Computer & Internet Engineering</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="batch" className="block text-sm font-medium leading-none mb-2">
                    Batch
                  </label>
                  <select
                    id="batch"
                    name="batch"
                    defaultValue={user.batch ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Batch</option>
                    <option value="28">28' (2024-2028)</option>
                    <option value="27">27' (2023-2027)</option>
                    <option value="26">26' (2022-2026)</option>
                    <option value="25">25' (2021-2025)</option>
                  </select>
                </div>
              </>
            )}

            <button
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
            >
            {isPending ? "Saving..." : "Save Changes"}
            </button>
        </form>
      </div>
    </div>
  );
}
