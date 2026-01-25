import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ResourcePreview from "@/components/ResourcePreview";

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
    <section className="p-6">
      <h1 className="text-3xl font-bold">{resource.title}</h1>
      <p className="text-gray-600">{resource.description}</p>
      <p className="text-sm text-gray-500 mt-2">
        Uploaded by {resource.user.name} • {resource.viewCount} views
      </p>

      <ResourcePreview fileUrl={resource.fileUrl} type={resource.type} resourceId={id} />
    </section>
  );
}
