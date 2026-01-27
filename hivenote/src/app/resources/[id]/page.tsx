import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ResourcePreview from "@/components/features/ResourcePreview";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Eye } from "lucide-react";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResourceDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!resource) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: resource.title }]} />
        
        <div className="mb-10 mt-6">
            <div className="flex items-center gap-3 mb-4">
                 <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${resource.type === 'PDF' ? 'border-transparent bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400' : 'border-transparent bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'}`}>
                    {resource.type}
                </span>
                <span className="text-sm text-muted-foreground">
                    {new Date(resource.createdAt).toLocaleDateString()}
                </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-6">{resource.title}</h1>
            
            {resource.description && (
                <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mb-8">
                    {resource.description}
                </p>
            )}

            <div className="flex items-center gap-6 text-sm text-muted-foreground border-y py-4">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Posted by</span>
                    <span className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground">
                                {resource.user.name?.[0] || "A"}
                         </div>
                        {resource.user.name || "Anonymous"}
                    </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{resource.viewCount} views</span>
                </div>
            </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
           {/* We pass specific styling props or classNames if ResourcePreview accepts them, otherwise we wrap it */}
           <div className="p-1">
             <ResourcePreview fileUrl={resource.fileUrl} type={resource.type} resourceId={id} />
           </div>
        </div>
      </div>
    </div>
  );
}
