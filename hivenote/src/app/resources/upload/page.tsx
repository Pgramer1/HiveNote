import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createResource } from "./actions";

export const runtime = "nodejs";

export default async function UploadPage() {
  const session = await getSession();

  if (!session) {
    redirect("/api/auth/signin");
  }
  return (
    <section className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Upload Resource</h1>

      <form action={createResource} className="space-y-4">
        <input
          name="title"
          placeholder="Title"
          required
          className="w-full border p-2 rounded"
        />

        <textarea
          name="description"
          placeholder="Description (optional)"
          className="w-full border p-2 rounded"
        />

        <select
          name="type"
          required
          className="w-full border p-2 rounded"
        >
          <option value="PDF">PDF</option>
          <option value="LINK">Link</option>
        </select>

        <input
          type="file"
          name="file"
          accept=".pdf"
          className="w-full"
        />

        <input
          type="url"
          name="link"
          placeholder="External link (if type is LINK)"
          className="w-full border p-2 rounded"
        />

        <button className="bg-black text-white px-4 py-2 rounded">
          Upload
        </button>
      </form>
    </section>
  );
}
