import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ChevronUp } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";


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
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-4xl">
        <Breadcrumbs items={[{ label: user.name ?? "User" }]} />
        
        {/* Profile Header & Stats */}
        <div className="mb-10 mt-6 pb-8 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted shrink-0">
                            <Image
                              src={getAvatarUrl(user.email || "anonymous")}
                              alt={user.name ?? "User avatar"}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                             <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground truncate">
                                {user.name ?? "Anonymous User"}
                            </h1>
                             <p className="text-muted-foreground truncate">{user.email}</p>
                        </div>
                     </div>
                     
                     <p className="text-sm text-muted-foreground mt-2 mb-4">
                        Joined on {user.createdAt.toDateString()}
                    </p>

                     {badges.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {badges.map((badge) => (
                          <span
                            key={badge}
                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200"
                          >
                            🏆 {badge}
                          </span>
                        ))}
                      </div>
                    )}

                    {user.bio && (
                        <div className="mt-2 text-sm text-muted-foreground">
                           <p className="leading-relaxed">
                             {user.bio}
                           </p>
                        </div>
                    )}
                </div>

                {/* Right Side: Stats & Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-6 w-full md:w-auto mt-2 md:mt-0 shrink-0">
                    {/* Edit Button and Logout */}
                     {isOwner && (
                        <div className="flex flex-col md:flex-col gap-3">
                            <Link
                            href="/me/edit"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                            >
                            Edit profile
                            </Link>
                            <form action="/api/auth/signout" method="post">
                                <button
                                    type="submit"
                                    className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-red-200 bg-background text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:hover:bg-red-950/20 h-9 px-4 py-2"
                                >
                                    Logout
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Stats - Minimalist */}
                    <div className="flex gap-8 ml-auto md:ml-0">
                        <div className="text-right">
                             <div className="text-2xl md:text-3xl font-bold text-foreground">{totalUploads}</div>
                             <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Resources</div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl md:text-3xl font-bold text-foreground">{totalScore}</div>
                             <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Score</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Uploaded Resources */}
         <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
             Uploaded Resources
            </h2>
            
             {user.resources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-xl border border-dashed text-center">
                    <p className="text-muted-foreground">This user hasn't uploaded any resources yet.</p>
                </div>
             ) : (
                 <div className="grid gap-4">
                     {user.resources.map((resource) => {
                         const score = resource.votes.reduce(
                            (s, v) => s + v.value,
                            0
                          );
                          return (
                            <Link
                             key={resource.id}
                             href={`/resources/${resource.id}`}
                             className="group flex flex-col md:flex-row justify-between p-6 bg-card border rounded-xl hover:shadow-md hover:border-primary/20 transition-all duration-200 gap-4"
                            >
                                <div className="space-y-2">
                                     <div className="flex items-center gap-2 mb-1">
                                         <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors ${resource.type === 'PDF' ? 'border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400' : resource.type === 'PPT' ? 'border-transparent bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'border-transparent bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                                            {resource.type}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors text-card-foreground">
                                        {resource.title}
                                    </h3>
                                     <p className="text-sm text-muted-foreground line-clamp-2">
                                        {resource.description || "No description provided."}
                                     </p>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm self-start md:self-center bg-muted/50 px-3 py-1 rounded-full">
                                    <ChevronUp className="w-4 h-4" />
                                    <span className="font-medium">{score}</span>
                                </div>
                            </Link>
                          )
                     })}
                 </div>
             )}
         </div>

      </div>
    </div>
  );
}
