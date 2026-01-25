"use client";

import { useTransition } from "react";
import { updateProfile } from "./actions";

export default function EditProfileForm({ user }: { user: any }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="max-w-xl mx-auto p-6 space-y-4"
      action={(formData) =>
        startTransition(() => updateProfile(formData))
      }
    >
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <input
        name="name"
        defaultValue={user.name ?? ""}
        placeholder="Your name"
        className="border p-2 rounded w-full"
      />

      <textarea
        name="bio"
        defaultValue={user.bio ?? ""}
        placeholder="Short bio"
        className="border p-2 rounded w-full"
      />

      <button
        disabled={isPending}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Save
      </button>
    </form>
  );
}
