import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserFavorites } from "@/actions/favorites";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import VoteButtons from "@/components/features/VoteButtons";
import FavoriteButton from "@/components/features/FavoriteButton";
import { calculateResourceScore } from "@/utils/resources";
import { Heart, FileText, Link2, Presentation, Eye } from "lucide-react";

export default async function MyFavoritesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    redirect("/api/auth/signin");
  }

  const favorites = await getUserFavorites();

  // Calculate scores for each favorite
  const favoritesWithScore = favorites.map((resource: any) =>
    calculateResourceScore(resource, user.id)
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Breadcrumbs items={[{ label: "My Favorites" }]} />

        <div className="flex items-center gap-3 mb-8 mt-4">
          <Heart className="w-8 h-8 text-red-500 fill-current" />
          <h1 className="text-3xl font-bold tracking-tight">My Favorites</h1>
        </div>

        {favoritesWithScore.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-xl border border-dashed text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-2xl font-semibold mb-2 text-foreground">
              No favorites yet
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              Start adding resources to your favorites to see them here
            </p>
            <Link
              href="/resources"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Browse Resources
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              You have {favoritesWithScore.length} favorite{favoritesWithScore.length !== 1 ? "s" : ""}
            </p>

            <div className="grid gap-4">
              {favoritesWithScore.map((resource: any) => (
                <div
                  key={resource.id}
                  className="group relative flex items-start gap-4 p-5 bg-card border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                >
                  {/* Icon Box */}
                  <div className="shrink-0 mt-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs ${
                      resource.type === 'PDF' 
                        ? 'bg-blue-500/10 border-blue-200/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400' 
                        : resource.type === 'PPT'
                        ? 'bg-orange-500/10 border-orange-200/50 text-orange-600 dark:border-orange-500/20 dark:text-orange-400'
                        : 'bg-emerald-500/10 border-emerald-200/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400'
                    }`}>
                      {resource.type === 'PDF' ? (
                        <FileText className="w-6 h-6" />
                      ) : resource.type === 'PPT' ? (
                        <Presentation className="w-6 h-6" />
                      ) : (
                        <Link2 className="w-6 h-6" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Link
                      href={`/resources/${resource.id}`}
                      className="block group-hover:text-primary transition-colors"
                    >
                      <h3 className="text-lg font-bold leading-tight tracking-tight">
                        {resource.title}
                      </h3>
                    </Link>
                    
                    {resource.description && (
                      <p className="text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="inline-block px-2 py-1 bg-muted/50 rounded text-xs font-medium">
                        {resource.type}
                      </span>
                      <span>
                        by{" "}
                        <Link
                          href={`/users/${resource.user.id}`}
                          className="underline hover:text-foreground font-medium"
                        >
                          {resource.user.name || "Anonymous"}
                        </Link>
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {resource.viewCount}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <VoteButtons
                      resourceId={resource.id}
                      score={resource.score}
                      userVote={resource.userVote}
                      isLoggedIn={true}
                    />
                    <FavoriteButton
                      resourceId={resource.id}
                      isFavorited={true}
                      isLoggedIn={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
