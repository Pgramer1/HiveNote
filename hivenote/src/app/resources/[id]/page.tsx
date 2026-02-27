import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ResourcePageClient from "@/components/features/ResourcePageClient";
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

        <ResourcePageClient
          resource={resource}
          resourceId={id}
          initialComments={comments}
        />
      </div>
    </div>
  );
}
