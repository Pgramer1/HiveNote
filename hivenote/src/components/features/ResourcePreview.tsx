"use client";

import { useEffect } from "react";
import { incrementViewCount } from "@/actions/incrementView";
import { ExternalLink } from "lucide-react";

type Props = {
  fileUrl: string;
  type: "PDF" | "PPT" | "LINK";
  resourceId: string;
  showPreview?: boolean;
};

export default function ResourcePreview({ fileUrl, type, resourceId, showPreview = true }: Props) {
  useEffect(() => {
    // Check if user viewed this resource recently (within 5 minutes)
    const viewKey = `viewed_${resourceId}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000; // 5 minutes

    if (!lastViewed || now - parseInt(lastViewed) > cooldownMs) {
      incrementViewCount(resourceId);
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

  if (type === "PPT") {
    const officeViewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    return (
      <div className="h-full">
        {showPreview ? (
          <div className="overflow-hidden h-full">
            <iframe
              src={officeViewUrl}
              className="w-full h-full"
              title="Presentation Preview"
              frameBorder="0"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <p className="text-sm">Preview hidden. Use the toolbar above to show it.</p>
            <a
              href={officeViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        )}
      </div>
    );
  }

  const viewUrl = `/api/pdf?url=${encodeURIComponent(fileUrl)}`;

  return (
    <div className="h-full">
      {showPreview ? (
        <div className="overflow-hidden h-full">
          <iframe
            src={viewUrl}
            className="w-full h-full"
            title="PDF Preview"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <p className="text-sm">Preview hidden. Use the toolbar above to show it.</p>
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
    </div>
  );
}
