import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function MyUploadsPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/api/auth/signin");
  }

  const resources = await prisma.resource.findMany({
    where: {
      uploadedBy: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section className="p-8 min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-10 dark:text-white">My Uploads</h1>

        {resources.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              You haven't uploaded any resources yet.
            </p>
            <Link
              href="/resources/upload"
              className="inline-block bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              Upload your first resource
            </Link>
            </div>
        ) : (
          <ul className="space-y-6">
            {resources.map((resource) => (
              <li
                key={resource.id}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800 hover:shadow-lg transition hover:border-blue-400 dark:hover:border-blue-500"
              >
                <Link
                  href={`/resources/${resource.id}`}
                  className="text-xl font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white"
                >
                  {resource.title}
                </Link>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-2">
                  <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium dark:text-gray-300">
                    {resource.type}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
