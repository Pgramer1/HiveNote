"use client";

import { useState } from "react";
import { Eye, FileText, MessageSquare, MessageCircle } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";
import Link from "next/link";
import ResourceChatBot from "./ResourceChatBot";
import ResourceDiscussion from "./ResourceDiscussion";
import type { CommentWithUser } from "@/actions/comments";

type Tab = "details" | "ai" | "discussion";

type Props = {
  resource: any;
  resourceId: string;
  initialComments: CommentWithUser[];
};

export default function TabbedSidebar({ resource, resourceId, initialComments }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  return (
    <div className="bg-card rounded-xl border shadow-sm h-full flex flex-col">
      {/* Tabs Header */}
      <div className="flex border-b bg-muted/20">
        <button
          onClick={() => setActiveTab("details")}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === "details"
              ? "border-b-2 border-primary text-primary bg-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <FileText className="w-4 h-4" />
          Details
        </button>
        <button
          onClick={() => setActiveTab("discussion")}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === "discussion"
              ? "border-b-2 border-primary text-primary bg-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Discussion
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === "ai"
              ? "border-b-2 border-primary text-primary bg-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          AI
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "details" ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                    resource.type === "PDF"
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      : "bg-green-500/10 text-green-600 border-green-500/20"
                  }`}
                >
                  {resource.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(resource.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {resource.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-foreground">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {resource.description}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Author</h3>
                <Link
                  href={`/users/${resource.uploadedBy}`}
                  className="flex items-center gap-3 hover:bg-muted/50 p-3 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted ring-2 ring-background group-hover:ring-primary/20 transition-all">
                    <Image
                      src={getAvatarUrl(resource.user.name || "Anonymous")}
                      alt={resource.user.name || "Anonymous"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm font-medium group-hover:text-foreground transition-colors">
                    {resource.user.name || "Anonymous"}
                  </span>
                </Link>

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <Eye className="w-4 h-4" />
                  <span>{resource.viewCount} views</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "discussion" ? (
          <div className="h-full">
            <ResourceDiscussion resourceId={resourceId} initialComments={initialComments} />
          </div>
        ) : (
          <div className="h-full">
            <ResourceChatBot
              resourceId={resourceId}
              resourceTitle={resource.title}
              resourceType={resource.type}
            />
          </div>
        )}
      </div>
    </div>
  );
}
