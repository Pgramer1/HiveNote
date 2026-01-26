"use client";

import { useTransition } from "react";
import { updateProfile } from "./actions";

export default function EditProfileForm({ user }: { user: any }) {
  const [isPending, startTransition] = useTransition();

  return (
    <section className="p-8 min-h-screen bg-white dark:bg-gray-900">
      <form
        className="max-w-2xl mx-auto space-y-6 bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700"
        action={(formData) =>
          startTransition(() => updateProfile(formData))
        }
      >
        <h1 className="text-4xl font-bold mb-8 dark:text-white">Edit Profile</h1>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2 dark:text-gray-300">
            Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={user.name ?? ""}
            placeholder="Your name"
            className="border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg w-full focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition bg-white dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-2 dark:text-gray-300">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={user.bio ?? ""}
            placeholder="Tell us about yourself..."
            rows={4}
            className="border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg w-full focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition bg-white dark:bg-gray-900 dark:text-white"
          />
        </div>

        <button
          disabled={isPending}
          className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </section>
  );
}
