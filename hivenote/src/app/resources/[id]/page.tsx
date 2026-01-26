import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ResourcePreview from "@/components/ResourcePreview";
import Breadcrumbs from "@/components/Breadcrumbs";

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

  return (
    <section className="p-8 min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: resource.title }]} />
        <h1 className="text-4xl font-bold mb-4 dark:text-white">{resource.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">{resource.description}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Uploaded by {resource.user.name || "Anonymous"} • 👁️ {resource.viewCount} views
        </p>

        <ResourcePreview fileUrl={resource.fileUrl} type={resource.type} resourceId={id} />
      </div>
    </section>
  );
}
