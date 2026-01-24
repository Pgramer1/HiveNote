import { prisma } from "@/lib/prisma";
import Link from "next/link";


export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Resources</h1>

      {resources.length === 0 && (
        <p className="text-gray-500">No resources found.</p>
      )}

      <ul className="space-y-4">
        {resources.map((resource) => (
          <li
            key={resource.id}
            className="border rounded-lg p-4 hover:shadow"
          >
            <Link
                href={`/resources/${resource.id}`}
                className="text-xl font-semibold hover:underline"
                >
                {resource.title}
            </Link>
            {resource.description && (
              <p className="text-gray-600 mt-1">
                {resource.description}
              </p>
            )}

            <div className="text-sm text-gray-500 mt-2">
              Uploaded by <span className="font-medium">
                {resource.user.name}
              </span>
            </div>

            <a
              href={resource.fileUrl}
              target="_blank"
              className="inline-block mt-3 text-blue-600 hover:underline"
            >
              {resource.type === "PDF" ? "View PDF" : "Open Link"}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
