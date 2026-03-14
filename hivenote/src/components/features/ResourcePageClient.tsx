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
  const viewUrl = resource.type === "PPT"
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resource.fileUrl)}`
    : `/api/pdf?url=${encodeURIComponent(resource.fileUrl)}`;

  return (
    <div className="flex flex-col lg:h-[calc(100vh-110px)]">
      {/* Title row with optional toolbar on the right */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h1 className="text-2xl font-bold truncate">{resource.title}</h1>
        {(resource.type === "PDF" || resource.type === "PPT") && (
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-background border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors flex-1 sm:flex-none"
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors flex-1 sm:flex-none"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        )}
      </div>

      {/* Mobile layout: stack preview then tabs */}
      <div className="lg:hidden flex flex-col gap-3 flex-1 min-h-0">
        <div className="h-[52vh] min-h-80 rounded-xl border overflow-hidden bg-card">
          <ResourcePreview
            fileUrl={resource.fileUrl}
            type={resource.type}
            resourceId={resourceId}
            showPreview={showPreview}
          />
        </div>
        <div className="h-[58vh] min-h-90 overflow-hidden">
          <TabbedSidebar resource={resource} resourceId={resourceId} initialComments={initialComments} />
        </div>
      </div>

      {/* Desktop/tablet layout: resizable side-by-side panels */}
      <div className="hidden lg:block flex-1 min-h-0">
        <ResizableLayout
          className="flex-1 h-full"
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
    </div>
  );
}
