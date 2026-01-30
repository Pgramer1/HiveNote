"use client";

import { useState, useEffect } from "react";
import { incrementViewCount } from "@/actions/incrementView";
import { ExternalLink, Eye, EyeOff } from "lucide-react";

type Props = {
  fileUrl: string;
  type: "PDF" | "LINK";
  resourceId: string;
};

export default function ResourcePreview({ fileUrl, type, resourceId }: Props) {
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    // Check if user viewed this resource recently (within 5 minutes)
    const viewKey = `viewed_${resourceId}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000; // 5 minutes

    if (!lastViewed || now - parseInt(lastViewed) > cooldownMs) {
      // Increment view count
      incrementViewCount(resourceId);
      // Store current timestamp
      localStorage.setItem(viewKey, now.toString());
    }
  }, [resourceId]);

  if (type === "LINK") {
    return (
      <div className="flex items-center justify-center py-16">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
        >
          <ExternalLink className="w-5 h-5" />
          Visit External Link
        </a>
      </div>
    );
  }

  // Use proxy API to serve PDFs with inline headers
  const viewUrl = `/api/pdf?url=${encodeURIComponent(fileUrl)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>PDF Preview</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 rounded-md bg-background border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Preview
              </>
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
      </div>

      {showPreview && (
        <div className="rounded-lg overflow-hidden border shadow-md bg-muted/20" style={{ height: '750px' }}>
          <iframe
            src={viewUrl}
            className="w-full h-full"
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
}
