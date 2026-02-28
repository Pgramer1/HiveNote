import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileText, Link2, Presentation } from "lucide-react";

export default async function MyUploadsPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/api/auth/signin");
  }

  const resources = await prisma.resource.findMany({
    where: {
      uploadedBy: user.id,
    },
    include: {
        votes: {
            select: { value: true }
        }
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-4xl">
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-10 mt-6">My Uploads</h1>

        {resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-xl border border-dashed text-center">
            <p className="text-muted-foreground text-lg mb-6">
              You haven't uploaded any resources yet.
            </p>
            <Link
              href="/resources/upload"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Upload your first resource
            </Link>
            </div>
        ) : (
          <div className="grid gap-4">
            {resources.map((resource) => {
               const score = resource.votes.reduce((acc, vote) => acc + vote.value, 0);
               return (
                <div
                    key={resource.id}
                    className="group relative flex items-start gap-4 p-5 bg-card border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                >
                     {/* Icon Box */}
                    <div className="shrink-0 mt-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs ${resource.type === 'PDF' ? 'bg-blue-500/10 border-blue-200/50 text-blue-600 dark:border-blue-500/20 dark:text-blue-400' : resource.type === 'PPT' ? 'bg-orange-500/10 border-orange-200/50 text-orange-600 dark:border-orange-500/20 dark:text-orange-400' : 'bg-emerald-500/10 border-emerald-200/50 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400'}`}>
                            {resource.type === 'PDF' ? (
                                <FileText className="w-6 h-6" />
                            ) : resource.type === 'PPT' ? (
                                <Presentation className="w-6 h-6" />
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
                            <h3 className="text-lg font-bold leading-tight tracking-tight">
                            {resource.title}
                            </h3>
                        </Link>
                        
                        <p className="text-sm text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap">
                           {resource.description || "No description provided."}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                            <span>
                                {new Date(resource.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>{score} points</span>
                        </div>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
