import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VoteButtons from "@/components/VoteButtons";
import { getSession } from "@/lib/auth";



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
      select: { email: true },
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
    <section className="p-6">
      {/* Page title */}
      <h1 className="text-3xl font-bold mb-6">Resources</h1>

      {/* Sort buttons */}
      <div className="flex gap-4 mb-6">
        <Link
          href={`/resources?query=${query}&type=${type}&sort=new`}
          className={`underline ${
            sort === "new" ? "font-semibold" : ""
          }`}
        >
          Newest
        </Link>

        <Link
          href={`/resources?query=${query}&type=${type}&sort=popular`}
          className={`underline ${
            sort === "popular" ? "font-semibold" : ""
          }`}
        >
          Most Popular
        </Link>
      </div>

      {/* Search + Filter Form
          - GET method so values appear in URL
          - URL becomes shareable & bookmarkable
      */}
      <form
        method="GET"
        className="flex flex-col md:flex-row gap-4 mb-8"
      >
        {/* Search input */}
        <input
          type="text"
          name="query"
          placeholder="Search resources by title..."
          defaultValue={query}
          className="border p-2 rounded w-full"
        />

        {/* Type filter */}
        <select
          name="type"
          defaultValue={type}
          className="border p-2 rounded w-40"
        >
          <option value="">All Types</option>
          <option value="PDF">PDF</option>
          <option value="LINK">Link</option>
        </select>

        {/* Submit */}
        <button className="bg-black text-white px-6 rounded">
          Search
        </button>

        {/* Clear filters (UX improvement) */}
        {(query || type) && (
          <Link
            href="/resources"
            className="text-sm text-gray-500 underline self-center"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Results */}
      {resources.length === 0 ? (
        <p className="text-gray-500">
          No resources found. Try adjusting your search.
        </p>
      ) : (
        <ul className="space-y-4">
          {sortedResources.map((resource) => (
            <li
              key={resource.id}
              className="border rounded p-4 hover:bg-gray-50 transition"
            >
              <Link
                href={`/resources/${resource.id}`}
                className="text-lg font-semibold hover:underline"
              >
                {resource.title}
              </Link>

              <p className="text-sm text-gray-500 mt-1">
                {resource.type} • uploaded by {resource.user.email} • {resource.viewCount} views
              </p>
              <VoteButtons resourceId={resource.id} score={resource.score} userVote={resource.userVote} isLoggedIn={!!currentUser} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
