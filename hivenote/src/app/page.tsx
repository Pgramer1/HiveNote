import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import HomeSearchBar from "@/components/HomeSearchBar";

export default async function Home() {
  const session = await getSession();

  // Fetch stats and resources
  const [totalResources, totalUsers, recentResources, trendingResources] = await Promise.all([
    prisma.resource.count(),
    prisma.user.count(),
    prisma.resource.findMany({
      take: 3,
      include: {
        user: {
          select: { id: true, name: true },
        },
        votes: {
          select: { value: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.resource.findMany({
      take: 3,
      include: {
        user: {
          select: { id: true, name: true },
        },
        votes: {
          select: { value: true },
        },
      },
    }),
  ]);

  // Calculate scores and sort trending by score
  const trendingWithScore = trendingResources
    .map((resource) => ({
      ...resource,
      score: resource.votes.reduce((sum, vote) => sum + vote.value, 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const recentWithScore = recentResources.map((resource) => ({
    ...resource,
    score: resource.votes.reduce((sum, vote) => sum + vote.value, 0),
  }));

  return (
    <section className="min-h-screen bg-linear-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto text-center pt-20 pb-20 px-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-6xl font-bold mb-6 bg-linear-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          🐝 Welcome to HiveNote
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Centralized learning resources for students - find notes, PDFs, and curated links uploaded by your peers
        </p>

        {/* Search Bar */}
        <HomeSearchBar />

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 justify-center mt-10">
          <Link
            href="/resources"
            className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition text-lg font-medium shadow-lg hover:shadow-xl"
          >
            Browse All Resources
          </Link>
          {session ? (
            <Link
              href="/resources/upload"
              className="bg-blue-600 dark:bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-lg font-medium shadow-lg hover:shadow-xl"
            >
              Upload Resource
            </Link>
          ) : (
            <form action="/api/auth/signin" method="post">
              <button className="bg-linear-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-500 transition text-lg font-medium shadow-lg hover:shadow-xl">
                Login to Upload
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-5xl mx-auto px-6 py-20 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-3xl font-bold mb-10 text-center dark:text-white">Platform Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-10 rounded-xl border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-xl transition">
            <div className="flex items-center gap-4">
              <span className="text-5xl">📚</span>
              <div>
                <p className="text-5xl font-bold text-blue-900 dark:text-blue-100">{totalResources}</p>
                <p className="text-gray-700 dark:text-gray-300 mt-2 text-lg">Learning Resources</p>
              </div>
            </div>
          </div>
          <div className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-10 rounded-xl border border-green-200 dark:border-green-800 shadow-md hover:shadow-xl transition">
            <div className="flex items-center gap-4">
              <span className="text-5xl">👥</span>
              <div>
                <p className="text-5xl font-bold text-green-900 dark:text-green-100">{totalUsers}</p>
                <p className="text-gray-700 dark:text-gray-300 mt-2 text-lg">Contributors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links by Type */}
      <div className="max-w-5xl mx-auto px-6 py-20 border-b border-gray-200 dark:border-gray-800 bg-linear-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <h2 className="text-3xl font-bold mb-10 text-center dark:text-white">Browse by Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link
            href="/resources?type=PDF"
            className="group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-10 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl transition text-center"
          >
            <span className="text-6xl mb-4 block">📄</span>
            <h3 className="text-2xl font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition dark:text-white">PDF Documents</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">Notes, books, study materials</p>
          </Link>
          <Link
            href="/resources?type=LINK"
            className="group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-10 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:shadow-xl transition text-center"
          >
            <span className="text-6xl mb-4 block">🔗</span>
            <h3 className="text-2xl font-semibold group-hover:text-green-600 dark:group-hover:text-green-400 transition dark:text-white">External Links</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">Videos, articles, websites</p>
          </Link>
        </div>
      </div>

      {/* Trending & Recent Resources */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Trending Resources */}
          {trendingWithScore.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-2 dark:text-white">
                🔥 Trending Resources
              </h2>
              <div className="space-y-5">
                {trendingWithScore.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-xl hover:border-orange-400 dark:hover:border-orange-500 transition"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl font-bold text-gray-300 dark:text-gray-600">
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <Link
                          href={`/resources/${resource.id}`}
                          className="text-lg font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition block mb-3 dark:text-white"
                        >
                          {resource.title}
                        </Link>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-2 font-medium dark:text-gray-300">
                            {resource.type}
                          </span>
                          by{" "}
                          <Link
                            href={`/users/${resource.user.id}`}
                            className="underline hover:text-black dark:hover:text-white font-medium"
                          >
                            {resource.user.name || "Anonymous"}
                          </Link>
                          {" "}• ⬆️ {resource.score}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Resources */}
          {recentWithScore.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-2 dark:text-white">
                ✨ Recently Added
              </h2>
              <div className="space-y-5">
                {recentWithScore.map((resource) => (
                  <div
                    key={resource.id}
                    className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition"
                  >
                    <Link
                      href={`/resources/${resource.id}`}
                      className="text-lg font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition block mb-3 dark:text-white"
                    >
                      {resource.title}
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-2 font-medium dark:text-gray-300">
                        {resource.type}
                      </span>
                      by{" "}
                      <Link
                        href={`/users/${resource.user.id}`}
                        className="underline hover:text-black dark:hover:text-white font-medium"
                      >
                        {resource.user.name || "Anonymous"}
                      </Link>
                      {" "}• ⬆️ {resource.score}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View All Link */}
        <div className="text-center mt-16 pt-12 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/resources"
            className="inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-xl hover:underline"
          >
            View all resources →
          </Link>
        </div>
      </div>
    </section>
  );
}
