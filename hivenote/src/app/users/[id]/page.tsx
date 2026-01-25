import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";


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
    <section className="p-6 max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {user.name ?? "Anonymous User"}
        </h1>
        <p className="text-gray-600">{user.email}</p>
        <p className="text-sm text-gray-500 mt-1">
          Joined on {user.createdAt.toDateString()}
        </p>
        {user.bio && (
        <p className="mt-4 text-gray-700">
            {user.bio}
        </p>
        )}
        {isOwner && (
        <Link
            href="/me/edit"
            className="inline-block mt-4 text-sm underline"
        >
            Edit profile
        </Link>
    )}
      </div>

      {/* badge  */}
        <div className="flex gap-2 mt-2">
            {badges.map((badge) => (
                <span
                key={badge}
                className="px-2 py-1 text-xs bg-gray-200 rounded"
                >
                {badge}
                </span>
            ))}
        </div>


      {/* Stats */}
      <div className="flex gap-8 mb-8">
        <div>
          <p className="text-2xl font-bold">{totalUploads}</p>
          <p className="text-gray-500 text-sm">Uploads</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{totalScore}</p>
          <p className="text-gray-500 text-sm">Total Score</p>
        </div>
      </div>

      {/* Uploaded Resources */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Uploaded Resources
        </h2>

        {user.resources.length === 0 ? (
          <p className="text-gray-500">
            This user hasn’t uploaded any resources yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {user.resources.map((resource) => {
              const score = resource.votes.reduce(
                (s, v) => s + v.value,
                0
              );

              return (
                <li
                  key={resource.id}
                  className="border rounded p-4"
                >
                  <Link
                    href={`/resources/${resource.id}`}
                    className="font-semibold hover:underline"
                  >
                    {resource.title}
                  </Link>

                  <p className="text-sm text-gray-500 mt-1">
                    {resource.type} • score {score}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
