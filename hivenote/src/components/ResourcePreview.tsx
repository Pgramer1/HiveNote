"use client";

import { useState, useEffect } from "react";
import { incrementViewCount } from "@/app/resources/actions/incrementView";

type Props = {
  fileUrl: string;
  type: "PDF" | "LINK";
  resourceId: string;
};

export default function ResourcePreview({ fileUrl, type, resourceId }: Props) {
  const [showPreview, setShowPreview] = useState(false);

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
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
      >
        Visit Link
      </a>
    );
  }

  // Use proxy API to serve PDFs with inline headers
  const viewUrl = `/api/pdf?url=${encodeURIComponent(fileUrl)}`;
  const downloadUrl = `/api/pdf?url=${encodeURIComponent(fileUrl)}&download=true`;

  return (
    <div className="mt-4">
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>

        <a
          href={downloadUrl}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Download PDF
        </a>

        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
        >
          Open in New Tab
        </a>
      </div>

      {showPreview && (
        <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100" style={{ height: '600px' }}>
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
