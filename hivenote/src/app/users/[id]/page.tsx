import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import Breadcrumbs from "@/components/Breadcrumbs";


type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;

  // 1️⃣ Fetch user with resources and votes
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      resources: {
        include: {
          votes: {
            select: { value: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // 2️⃣ Compute stats
  const totalUploads = user.resources.length;

  const totalScore = user.resources.reduce((sum, resource) => {
    const resourceScore = resource.votes.reduce(
      (s, v) => s + v.value,
      0
    );
    return sum + resourceScore;
  }, 0);
        // add badge logic here
        const badges = [];

        if (totalUploads >= 5) badges.push("Contributor");
        if (totalScore >= 10) badges.push("Helpful");
        if (totalScore >= 50) badges.push("Top Contributor");

    // check if the viewer is the profile owner
    const session = await getSession();
    const isOwner = session?.user?.email === user.email;

  return (
    <section className="p-8 min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: user.name ?? "User" }]} />
        {/* Profile Header */}
        <div className="mb-10 pb-8 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl font-bold dark:text-white">
            {user.name ?? "Anonymous User"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{user.email}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Joined on {user.createdAt.toDateString()}
          </p>
          {user.bio && (
            <p className="mt-6 text-gray-700 dark:text-gray-300 text-lg bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              {user.bio}
            </p>
          )}
          {isOwner && (
            <Link
              href="/me/edit"
              className="inline-block mt-6 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              Edit profile
            </Link>
          )}
        </div>

        {/* badge  */}
        {badges.length > 0 && (
          <div className="flex gap-2 mb-10">
            {badges.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 text-sm bg-linear-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 border border-yellow-300 dark:border-yellow-700 rounded-lg font-medium dark:text-yellow-100"
              >
                🏆 {badge}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-8 mb-12 pb-8 border-b border-gray-200 dark:border-gray-800">
          <div className="bg-blue-50 dark:bg-blue-950 px-8 py-6 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{totalUploads}</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">Uploads</p>
          </div>

          <div className="bg-green-50 dark:bg-green-950 px-8 py-6 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-4xl font-bold text-green-900 dark:text-green-100">{totalScore}</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">Total Score</p>
          </div>
        </div>

      {/* Uploaded Resources */}
      <div>
        <h2 className="text-3xl font-bold mb-8 dark:text-white">
          Uploaded Resources
        </h2>

        {user.resources.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              This user hasn't uploaded any resources yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-6">
            {user.resources.map((resource) => {
              const score = resource.votes.reduce(
                (s, v) => s + v.value,
                0
              );

              return (
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
                    <span>•</span>
                    <span>⬆️ {score}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </div>
    </section>
  );
}
