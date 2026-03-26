import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCurrentUser } from "@/lib/permissions";
import { getUserFavorites } from "@/actions/favorites";
import { unstable_cache } from "next/cache";
import { FileText, Link2, Presentation, ChevronUp, Flame, Sparkles, Heart, Building2, ShieldCheck, KeyRound, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const getTotalUsersCached = unstable_cache(
  async () => prisma.user.count(),
  ["home-total-users"],
  { revalidate: 300 }
);

const getTotalResourcesCached = unstable_cache(
  async () => prisma.resource.count(),
  ["home-total-resources"],
  { revalidate: 120 }
);

const getRecentResourcesCached = unstable_cache(
  async () =>
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
  ["home-recent-resources"],
  { revalidate: 60 }
);

const getTrendingResourcesCached = unstable_cache(
  async () =>
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
  ["home-trending-base"],
  { revalidate: 60 }
);

export default async function Home() {
  const session = await getSession();
  const fullCurrentUser = await getCurrentUser();

  // Get current user for favorites and university check
  const currentUser = fullCurrentUser
    ? {
        id: fullCurrentUser.id,
        isUniversityEmail: fullCurrentUser.isUniversityEmail,
      }
    : null;

  const canViewUniversityResources = Boolean(currentUser?.isUniversityEmail);

  // Fetch favorites if logged in
  const userFavorites = canViewUniversityResources ? await getUserFavorites() : [];

  // Fetch stats and resources
  const [totalResources, totalUsers, recentResources, trendingResources] = await Promise.all([
    canViewUniversityResources ? getTotalResourcesCached() : Promise.resolve(0),
    getTotalUsersCached(),
    canViewUniversityResources
      ? getRecentResourcesCached()
      : Promise.resolve([]),
    canViewUniversityResources
      ? getTrendingResourcesCached()
      : Promise.resolve([]),
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

  const resourceStatText = canViewUniversityResources ? `${totalResources}+` : "Campus-only";
  const firstTimeSteps = [
    {
      title: "Sign in with your university email",
      description: "Use your official institute email to start verification and unlock campus access.",
      href: "/api/auth/signin",
      cta: "Sign In",
    },
    {
      title: "Wait for verification mail",
      description: "Check Outlook inbox; verification mail usually arrives in around 2 minutes.",
      href: "#guest-faq",
      cta: "See Verification FAQ",
    },
    {
      title: "Enter your university dashboard",
      description: "After login, go to your campus hub and select your academic path.",
      href: "/university",
      cta: "Open Dashboard",
    },
    {
      title: "Start learning and contributing",
      description: "Browse resources, open viewer, and upload your own material once access is active.",
      href: "/resources/upload",
      cta: "Get Started",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10">
      
      {/* Hero Section */}
      <section className="relative px-6 pt-10 pb-8 lg:pt-16 lg:pb-12 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-125 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-sm font-medium text-muted-foreground animate-fade-in-up">
            <span className="relative flex h-2 w-2">
			  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
			  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
			</span>
            Open Source Learning Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-primary">
            Collaborative Learning <br className="hidden sm:block" />
            <span className="text-muted-foreground">Made Simple.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover, share, and discuss learning materials with a community of students. 
            All your notes, PDFs, and links in one Hive.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {canViewUniversityResources ? (
              <>
                <Link 
                  href="/university" 
                  className={buttonVariants({ size: "lg", className: "rounded-full h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all" })}
                >
                  Go to My University
                </Link>
                <Link href="/resources/upload" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full h-12 px-8 text-base" })}>
                  Upload Resource
                </Link>
              </>
            ) : (
              <>
                <form action="/api/auth/signin" method="post">
                  <Button size="lg" className="rounded-full h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all">
                    Sign in with University Email
                  </Button>
                </form>
                <Link href="#guest-faq" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full h-12 px-8 text-base" })}>
                  Read FAQs
                </Link>
              </>
            )}
          </div>
          
          {/* Quick Stats */}
          <div className="pt-12 flex items-center justify-center gap-8 text-muted-foreground text-sm font-medium">
             <div className="flex flex-col items-center">
               <span className="text-2xl font-bold text-foreground">{resourceStatText}</span>
                <span>Resources</span>
             </div>
             <div className="w-px h-10 bg-border"></div>
             <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground">{totalUsers}+</span>
                <span>Students</span>
             </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="container mx-auto px-6 py-12 space-y-16">

        {!session && (
          <div className="rounded-3xl border bg-card/50 p-8 md:p-10">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2">
                First-time User Guide
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How to use HiveNote in 4 quick steps</h2>
            </div>
            <Link
              href="/api/auth/signin"
              className={buttonVariants({ variant: "outline", className: "rounded-full" })}
            >
              Start Verification
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {firstTimeSteps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border bg-background/70 p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-lg leading-tight">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                <div>
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    {step.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </div>
        )}

        {!canViewUniversityResources && (
          <div className="rounded-3xl border bg-card/60 p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2">
                  Campus Access
                </p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How to unlock Adani resources</h2>
                <p className="text-muted-foreground mt-3 max-w-2xl">
                  Resource files and previews are currently available only to Adani University students.
                  Sign in with your university email to get full access.
                </p>
              </div>
              <Link href="#guest-faq" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full px-8" })}>
                Check access FAQs
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border bg-background/70 p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">Use your campus email</h3>
                <p className="text-sm text-muted-foreground">Sign in with your official Adani University email account.</p>
              </div>

              <div className="rounded-2xl border bg-background/70 p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">Get verified instantly</h3>
                <p className="text-sm text-muted-foreground">We automatically verify your university access after login.</p>
              </div>

              <div className="rounded-2xl border bg-background/70 p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">Unlock viewer + uploads</h3>
                <p className="text-sm text-muted-foreground">Browse subject resources, use the viewer, and upload your materials.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Categories */}
          <div className="grid md:grid-cols-3 gap-6">
           <div className="block group">
              <Card className="h-full border-muted hover:border-primary/50 transition-colors cursor-pointer hover:shadow-md bg-muted/40 hover:bg-muted/60">
                 <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                       <FileText className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">PDF Documents</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {canViewUniversityResources
                         ? "Access lecture notes, textbooks, and research papers shared by the community."
                         : "Available after university sign-in. Includes notes, textbooks, and research PDFs."}
                    </CardDescription>
                 </CardHeader>
              </Card>
                </div>
              <div className="block group">
                <Card className="h-full border-muted hover:border-primary/50 transition-colors cursor-pointer hover:shadow-md bg-muted/40 hover:bg-muted/60">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                      <Presentation className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">PPT Decks</CardTitle>
                    <CardDescription className="text-base mt-2">
                      {canViewUniversityResources
                       ? "Access presentation slides and semester deck collections."
                       : "Available after university sign-in. Includes lecture slides and deck resources."}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
                <div className="block group">
              <Card className="h-full border-muted hover:border-primary/50 transition-colors cursor-pointer hover:shadow-md bg-muted/40 hover:bg-muted/60">
                 <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                       <Link2 className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">External Links</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {canViewUniversityResources
                         ? "Curated collections of video tutorials, articles, and useful websites."
                         : "Available after university sign-in. Includes curated links and references."}
                    </CardDescription>
                 </CardHeader>
              </Card>
                </div>
        </div>

              {!canViewUniversityResources && (
                <div id="guest-faq" className="space-y-6 scroll-mt-24">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
                    <form action="/api/auth/signin" method="post">
                      <Button variant="outline" className="rounded-full">Sign in to continue</Button>
                    </form>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-card/70">
                      <CardHeader>
                        <CardTitle className="text-xl">i) Why campus-only?</CardTitle>
                        <CardDescription className="text-base">
                          For now, resources are restricted to Adani University students to keep content academic, relevant, and tied to verified classes.
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="bg-card/70">
                      <CardHeader>
                        <CardTitle className="text-xl">ii) How long does verification take?</CardTitle>
                        <CardDescription className="text-base">
                          Usually very quick. The verification email should arrive in Outlook in about 2 minutes.
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="bg-card/70">
                      <CardHeader>
                        <CardTitle className="text-xl">iii) What about other universities/colleges?</CardTitle>
                        <CardDescription className="text-base">
                          Multi-campus support is planned and will be added soon. We are starting with Adani University first.
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="bg-card/70">
                      <CardHeader>
                        <CardTitle className="text-xl">iv) Can alumni access?</CardTitle>
                        <CardDescription className="text-base">
                          Alumni access is not fully supported yet. At present, access is designed for users with an active university email.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>
              )}

        {/* Favorites Section - Only shown when logged in */}
        {session && userFavorites.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Heart className="w-6 h-6 text-red-500 fill-current" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Your Favorites</h2>
              </div>
              <Link 
                href="/my-favorites" 
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all <ChevronUp className="w-4 h-4 rotate-90" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userFavorites.slice(0, 3).map((resource: any) => {
                const score = resource.votes.reduce((sum: number, vote: any) => sum + vote.value, 0);
                return (
                  <Link
                    key={resource.id}
                    href={`/resources/${resource.id}`}
                    className={cn(
                      "resource-book-card block p-6 border rounded-xl transition-all duration-300 hover:-translate-y-0.5",
                      resource.type === "PDF"
                        ? "resource-book-card--pdf"
                        : resource.type === "PPT"
                          ? "resource-book-card--ppt"
                          : "resource-book-card--link"
                    )}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {resource.type === "PDF" ? (
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : resource.type === "PPT" ? (
                        <Presentation className="w-6 h-6 text-orange-600 dark:text-orange-400 shrink-0" />
                      ) : (
                        <Link2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white line-clamp-2">
                          {resource.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                        {resource.type}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <ChevronUp className="w-4 h-4" /> {score}
                      </span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Trending Section */}
        {trendingWithScore.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Trending Now</h2>
              </div>
              <Link href="/resources?sort=trending" className={buttonVariants({ variant: "ghost", className: "group" })}>
                View all <ChevronUp className="ml-2 w-4 h-4 rotate-90 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingWithScore.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Section */}
        {recentWithScore.length > 0 && (
          <div className="space-y-8">
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Fresh from the Hive</h2>
              </div>
              <Link href="/resources?sort=newest" className={buttonVariants({ variant: "ghost", className: "group" })}>
                View all <ChevronUp className="ml-2 w-4 h-4 rotate-90 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentWithScore.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        )}

      </section>
    </div>
  );
}

// Helper component for resource cards
function ResourceCard({ resource }: { resource: any }) {
  return (
    <Link href={`/resources/${resource.id}`} className="block h-full">
      <Card
        className={cn(
          "resource-book-card flex flex-col transition-all duration-300 hover:-translate-y-1 h-full group",
          resource.type === "PDF"
            ? "resource-book-card--pdf"
            : resource.type === "PPT"
              ? "resource-book-card--ppt"
              : "resource-book-card--link"
        )}
      >
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex justify-between items-start gap-4 mb-2">
            <div className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border",
              resource.type === 'PDF' 
                ? 'bg-blue-500/5 text-blue-600 border-blue-500/20 dark:text-blue-400' 
                : resource.type === 'PPT'
                ? 'bg-orange-500/5 text-orange-600 border-orange-500/20 dark:text-orange-400'
                : 'bg-green-500/5 text-green-600 border-green-500/20 dark:text-green-400'
            )}>
              {resource.type}
            </div>
          </div>
          <CardTitle className="text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {resource.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 grow px-5">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {resource.description || "No description provided."}
          </p>
        </CardContent>
        <CardFooter className="pt-4 pb-5 px-5 text-xs text-muted-foreground border-t mt-auto flex justify-between items-center bg-muted/10">
          <div className="flex items-center gap-2">
            <span className="font-medium hover:text-foreground transition-colors truncate max-w-25">
              {resource.user.name || "Anonymous"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-foreground bg-background px-2 py-0.5 rounded border shadow-sm">
              <ChevronUp className="w-3 h-3" />
              {resource.score}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
