import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VoteButtons from "@/components/VoteButtons";


/**
 * In Next.js App Router (v16),
 * searchParams is ASYNC (Promise-based),
 * similar to route params.
 */
type SearchParams = Promise<{
  query?: string;
  type?: string;
}>;

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Await searchParams to extract values
  const { query = "", type = "" } = await searchParams;

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
      select: { value: true },
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

  return {
    ...resource,
    score,
  };
});

  return (
    <section className="p-6">
      {/* Page title */}
      <h1 className="text-3xl font-bold mb-6">Resources</h1>

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
          {resourcesWithScore.map((resource) => (
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
                {resource.type} • uploaded by {resource.user.email}
              </p>
              <VoteButtons resourceId={resource.id} score={resource.score} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
