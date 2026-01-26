import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VoteButtons from "@/components/VoteButtons";
import { getSession } from "@/lib/auth";
import Breadcrumbs from "@/components/Breadcrumbs";



/**
 * In Next.js App Router (v16),
 * searchParams is ASYNC (Promise-based),
 * similar to route params.
 */
type SearchParams = Promise<{
  query?: string;
  type?: string;
  sort?: string;
}>;

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Await searchParams to extract values
  const { query = "", type = "", sort = "new" } = await searchParams;
  const session = await getSession();
  const userEmail = session?.user?.email ?? null;

  // Get current user's ID if logged in
  const currentUser = userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      })
    : null;

  /**
   * Prisma query:
   * - Filters by title if `query` exists
   * - Filters by type (PDF / LINK) if selected
   * - Uses AND conditions so filters combine cleanly
   */
  const resources = await prisma.resource.findMany({
  where: {
    AND: [
      query
        ? {
            title: {
              contains: query,
              mode: "insensitive",
            },
          }
        : {},
      type
        ? {
            type: type as any,
          }
        : {},
    ],
  },
  include: {
    user: {
      select: { id: true, name: true },
    },
    votes: {
      select: { value: true ,userId: true},
    },
  },
  orderBy: {
    createdAt: "desc", // popularity sorting comes later
  },
});

// 2️⃣ Compute score for each resource 
const resourcesWithScore = resources.map((resource) => {
  const score = resource.votes.reduce(
    (sum, vote) => sum + vote.value,
    0
  );

  const userVote =
    currentUser
      ? resource.votes.find(
          (v) => v.userId === currentUser.id
        )?.value ?? 0
      : 0;

  return {
    ...resource,
    score,
    userVote,
  };
});


// 3️⃣ Sort resources based on selected option
const sortedResources = [...resourcesWithScore].sort((a, b) => {
  if (sort === "popular") {
    // Primary: score DESC
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // Fallback: createdAt DESC
    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  }

  // Default: newest first
  return (
    new Date(b.createdAt).getTime() -
    new Date(a.createdAt).getTime()
  );
});

  return (
    <section className="p-8 min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs items={[{ label: "Resources" }]} />
        <h1 className="text-4xl font-bold mb-8 dark:text-white">Resources</h1>

        {/* Search + Filter Form */}
        <form
          method="GET"
          className="flex flex-col gap-4 mb-10 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          {/* Top Row: Search + Type + Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <input
              type="text"
              name="query"
              placeholder="Search resources by title..."
              defaultValue={query}
              className="border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg flex-1 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition bg-white dark:bg-gray-900 dark:text-white"
            />

            {/* Type filter */}
            <select
              name="type"
              defaultValue={type}
              className="border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg w-full md:w-48 bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="">All Types</option>
              <option value="PDF">📄 PDF</option>
              <option value="LINK">🔗 Link</option>
            </select>

            {/* Sort filter */}
            <select
              name="sort"
              defaultValue={sort}
              className="border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg w-full md:w-48 bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="new">✨ Newest</option>
              <option value="popular">🔥 Most Popular</option>
            </select>

            {/* Submit */}
            <button className="bg-blue-600 dark:bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium shadow-md whitespace-nowrap">
              Apply
            </button>
          </div>

          {/* Clear filters */}
          {(query || type) && (
            <Link
              href="/resources"
              className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear all filters
            </Link>
          )}
        </form>

        {/* Results */}
        {resources.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-6xl mb-6">🔍</div>
            <h3 className="text-2xl font-bold mb-3 dark:text-white">No resources found</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
              Try adjusting your search or filter criteria
            </p>
            <Link
              href="/resources"
              className="inline-block bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              Clear all filters
            </Link>
          </div>
        ) : (
          <ul className="space-y-5">
            {sortedResources.map((resource) => (
              <li
                key={resource.id}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:bg-gray-50 dark:hover:bg-gray-850 hover:shadow-lg transition bg-white dark:bg-gray-800"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <Link
                      href={`/resources/${resource.id}`}
                      className="text-xl font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white block"
                    >
                      {resource.title}
                    </Link>
                    
                    {resource.description && (
                      <p className="text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                        {resource.description}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium dark:text-gray-300">
                        {resource.type}
                      </span>
                      <span>•</span>
                      <span>
                        uploaded by{" "}
                        <Link
                          href={`/users/${resource.user.id}`}
                          className="underline hover:text-black dark:hover:text-white font-medium"
                        >
                          {resource.user.name || "Anonymous"}
                        </Link>
                      </span>
                      <span>•</span>
                      <span>👁️ {resource.viewCount} views</span>
                    </p>
                  </div>
                  
                  <div className="shrink-0">
                    <VoteButtons resourceId={resource.id} score={resource.score} userVote={resource.userVote} isLoggedIn={!!currentUser} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
