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
    <section className="p-6">
      <h1 className="text-3xl font-bold mb-6">My Uploads</h1>

      {resources.length === 0 ? (
        <p className="text-gray-500">
          You haven’t uploaded any resources yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="border p-4 rounded"
            >
              <Link
                href={`/resources/${resource.id}`}
                className="font-semibold hover:underline"
              >
                {resource.title}
              </Link>

              <p className="text-sm text-gray-500">
                {resource.type}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
