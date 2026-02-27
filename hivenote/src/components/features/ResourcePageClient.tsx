"use client";

import { useState } from "react";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import ResourcePreview from "./ResourcePreview";
import TabbedSidebar from "./TabbedSidebar";
import ResizableLayout from "./ResizableLayout";

type Props = {
  resource: any;
  resourceId: string;
  initialComments: any[];
};

export default function ResourcePageClient({ resource, resourceId, initialComments }: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const viewUrl = `/api/pdf?url=${encodeURIComponent(resource.fileUrl)}`;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 110px)" }}>
      {/* Toolbar — only shown for PDF type */}
      {resource.type === "PDF" && (
        <div className="flex-shrink-0 flex items-center justify-end gap-2 mb-3 self-end">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 rounded-md bg-background border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {showPreview ? (
              <><EyeOff className="w-4 h-4" />Hide Preview</>
            ) : (
              <><Eye className="w-4 h-4" />Show Preview</>
            )}
          </button>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </a>
        </div>
      )}

      {/* Resizable two-panel layout — flex-1 fills remaining height */}
      <ResizableLayout
        className="flex-1"
        left={
          <ResourcePreview
            fileUrl={resource.fileUrl}
            type={resource.type}
            resourceId={resourceId}
            showPreview={showPreview}
          />
        }
        right={
          <TabbedSidebar resource={resource} resourceId={resourceId} initialComments={initialComments} />
        }
      />
    </div>
  );
}
