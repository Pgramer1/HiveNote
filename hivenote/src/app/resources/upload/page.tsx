import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import UploadForm from "./UploadForm";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export const runtime = "nodejs";

export default async function UploadPage() {
  const session = await getSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Upload" }]} />
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-8 mt-6">Upload Resource</h1>
        <div className="bg-card p-6 md:p-8 rounded-xl border shadow-sm">
          <UploadForm />
        </div>
      </div>
    </div>
  );
}
