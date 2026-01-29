import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VoteButtons from "@/components/features/VoteButtons";
import FavoriteButton from "@/components/features/FavoriteButton";
import { getSession } from "@/lib/auth";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { calculateResourceScore, sortResources } from "@/utils/resources";
import type { ResourceSortOption } from "@/types";
import { FileText, Link2, Sparkles, Flame, Eye } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";



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
    ...(currentUser ? {
      favorites: {
        where: { userId: currentUser.id },
        select: { id: true },
      }
    } : {}),
  },
  orderBy: {
    createdAt: "desc", // popularity sorting comes later
  },
});

// 2️⃣ Compute score for each resource using utility function
const resourcesWithScore = resources.map((resource: any) => 
  calculateResourceScore(resource, currentUser?.id)
);

// 3️⃣ Sort resources based on selected option using utility function
const sortedResources = sortResources(
  resourcesWithScore, 
  sort as ResourceSortOption
);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Breadcrumbs items={[{ label: "Resources" }]} />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 mt-4">
           <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
           {(query || type) && (
            <Link
              href="/resources"
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
            >
              Clear filters
            </Link>
          )}
        </div>

        {/* Search + Filter Form */}
        <div className="bg-card border rounded-xl p-4 shadow-sm mb-10">
            <form
            method="GET"
            className="flex flex-col md:flex-row gap-4"
            >
            {/* Search input */}
            <div className="flex-1 relative">
                <input
                    type="text"
                    name="query"
                    placeholder="Search resources..."
                    defaultValue={query}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            <div className="flex gap-4">
                {/* Type filter */}
                <select
                name="type"
                defaultValue={type}
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option value="">All Types</option>
                    <option value="PDF">PDF</option>
                    <option value="LINK">Link</option>
                </select>

                {/* Sort filter */}
                <select
                name="sort"
                defaultValue={sort}
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option value="new">Newest</option>
                    <option value="popular">Most Popular</option>
                </select>

                {/* Submit */}
                <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                    Apply
                </button>
            </div>
            </form>
        </div>

        {/* Results */}
        {resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-xl border border-dashed text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              We couldn't find any resources matching your criteria. Try adjusting your filters.
            </p>
            <Link
              href="/resources"
              className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 transition-colors"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedResources.map((resource) => (
              <div
                key={resource.id}
                className="group relative flex flex-col sm:flex-row items-start gap-4 p-5 bg-card border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all duration-200"
              >
                {/* Icon Box */}
                <div className="shrink-0 mt-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs ${resource.type === 'PDF' ? 'bg-blue-500/10 border-blue-200/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400' : 'bg-emerald-500/10 border-emerald-200/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400'}`}>
                        {resource.type === 'PDF' ? (
                            <FileText className="w-6 h-6" />
                        ) : (
                            <Link2 className="w-6 h-6" />
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <Link
                      href={`/resources/${resource.id}`}
                      className="block group-hover:text-primary transition-colors"
                    >
                      <h3 className="text-lg font-bold leading-tight tracking-tight pr-8">
                        {resource.title}
                      </h3>
                    </Link>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {resource.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground pt-1">
                        <Link href={`/users/${resource.user.id}`} className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors bg-muted/50 rounded-full pl-0.5 pr-2 py-0.5 border border-transparent hover:border-border">
                             <div className="w-4 h-4 rounded-full overflow-hidden bg-background border">
                                <Image
                                  src={getAvatarUrl(resource.user.name || "Anonymous")}
                                  alt={resource.user.name || "Anonymous"}
                                  width={16}
                                  height={16}
                                  className="w-full h-full object-cover"
                                />
                             </div>
                             {resource.user.name || "Anonymous"}
                        </Link>
                        <span className="text-muted-foreground/40">•</span>
                        <span>
                            {new Date(resource.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                </div>
                
                {/* Vote and Favorite Actions */}
                <div className="flex items-center gap-2 self-start sm:self-center mt-2 sm:mt-0">
                    <VoteButtons resourceId={resource.id} score={resource.score} userVote={resource.userVote} isLoggedIn={!!currentUser} />
                    <FavoriteButton 
                      resourceId={resource.id} 
                      isFavorited={(resource as any).favorites?.length > 0} 
                      isLoggedIn={!!currentUser} 
                    />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
