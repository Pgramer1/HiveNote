import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import HomeSearchBar from "@/components/features/HomeSearchBar";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { Hexagon, FileText, Link2, ChevronUp, Flame, Sparkles, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10">
      
      {/* Hero Section */}
      <section className="relative px-6 pt-10 pb-8 lg:pt-16 lg:pb-12 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-[100%] blur-3xl -z-10 pointer-events-none" />
        
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

          <div className="pt-1 pb-4">
            <HomeSearchBar />
          </div>

          <div className="flex flex-wrap justify-center gap-4">
             <Link href="/resources" className={buttonVariants({ size: "lg", className: "rounded-full h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all" })}>
               Browse Resources
             </Link>
             
             {!session && (
               <form action="/api/auth/signin" method="post">
                 <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-base">
                   Join the Hive
                 </Button>
               </form>
             )}
              {session && (
               <Link href="/resources/upload" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full h-12 px-8 text-base" })}>
                  Upload Resource
               </Link>
              )}
          </div>
          
          {/* Quick Stats */}
          <div className="pt-12 flex items-center justify-center gap-8 text-muted-foreground text-sm font-medium">
             <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground">{totalResources}+</span>
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
        
        {/* Categories */}
        <div className="grid md:grid-cols-2 gap-6">
           <Link href="/resources?type=PDF" className="block group">
              <Card className="h-full border-muted hover:border-primary/50 transition-colors cursor-pointer hover:shadow-md bg-muted/40 hover:bg-muted/60">
                 <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                       <FileText className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">PDF Documents</CardTitle>
                    <CardDescription className="text-base mt-2">
                       Access lecture notes, textbooks, and research papers shared by the community.
                    </CardDescription>
                 </CardHeader>
              </Card>
           </Link>
           <Link href="/resources?type=LINK" className="block group">
              <Card className="h-full border-muted hover:border-primary/50 transition-colors cursor-pointer hover:shadow-md bg-muted/40 hover:bg-muted/60">
                 <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                       <Link2 className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">External Links</CardTitle>
                    <CardDescription className="text-base mt-2">
                       Curated collections of video tutorials, articles, and useful websites.
                    </CardDescription>
                 </CardHeader>
              </Card>
           </Link>
        </div>

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

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
         <div className="container mx-auto px-6 flex flex-col items-center justify-center gap-6">
            <div className="flex items-center gap-2 font-bold text-xl">
               <Hexagon className="w-6 h-6 text-primary" />
               <span>HiveNote</span>
            </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} HiveNote. Built for students.</p>
         </div>
      </footer>
    </div>
  );
}

// Helper component for resource cards
function ResourceCard({ resource }: { resource: any }) {
  return (
    <Card className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full group">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex justify-between items-start gap-4 mb-2">
           <div className={cn(
             "px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border",
             resource.type === 'PDF' 
                ? 'bg-blue-500/5 text-blue-600 border-blue-500/20 dark:text-blue-400' 
                : 'bg-green-500/5 text-green-600 border-green-500/20 dark:text-green-400'
           )}>
              {resource.type}
           </div>
        </div>
        <CardTitle className="text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
           <Link href={`/resources/${resource.id}`} className="absolute inset-0 z-10" />
           {resource.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 grow px-5">
         <p className="text-sm text-muted-foreground line-clamp-2">
            {resource.description || "No description provided."}
         </p>
      </CardContent>
      <CardFooter className="pt-4 pb-5 px-5 text-xs text-muted-foreground border-t mt-auto flex justify-between items-center bg-muted/10">
         <div className="flex items-center gap-2 z-20">
            <span className="font-medium hover:text-foreground transition-colors truncate max-w-[100px]">
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
  )
}
