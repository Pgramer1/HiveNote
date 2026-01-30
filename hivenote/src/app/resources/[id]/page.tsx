import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ResourcePreview from "@/components/features/ResourcePreview";
import TabbedSidebar from "@/components/features/TabbedSidebar";
import { getResourceComments } from "@/actions/comments";

// CURRENT: Layout Option 2 - Two-Column with Tabbed Sidebar
// PDF takes more space (wider), tabbed sidebar with Details, Discussion, and AI Assistant

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResourceDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!resource) {
    notFound();
  }

  // Fetch comments for the resource
  const comments = await getResourceComments(id);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{resource.title}</h1>
        </div>
        
        <div className="grid lg:grid-cols-[1fr_420px] gap-4">
            {/* Left - PDF Preview (Wider) */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4">
                    <ResourcePreview fileUrl={resource.fileUrl} type={resource.type} resourceId={id} />
                </div>
            </div>

            {/* Right - Tabbed Sidebar */}
            <div className="lg:sticky lg:top-20" style={{ height: "calc(100vh - 120px)" }}>
                <TabbedSidebar resource={resource} resourceId={id} initialComments={comments} />
            </div>
        </div>
      </div>
    </div>
  );
}
