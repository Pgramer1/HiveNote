import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import UploadForm from "./UploadForm";
import Breadcrumbs from "@/components/Breadcrumbs";

export const runtime = "nodejs";

export default async function UploadPage() {
  const session = await getSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <section className="p-8 min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Upload" }]} />
        <h1 className="text-4xl font-bold mb-8 dark:text-white">Upload Resource</h1>
        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
          <UploadForm />
        </div>
      </div>
    </section>
  );
}
