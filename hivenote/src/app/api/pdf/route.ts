import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const download = request.nextUrl.searchParams.get("download") === "true";

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  try {
    // Fetch the PDF from Cloudinary
    const response = await fetch(url);
    
    if (!response.ok) {
      return new NextResponse("Failed to fetch PDF", { status: response.status });
    }

    const pdfBuffer = await response.arrayBuffer();

    // Serve with appropriate headers
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download ? "attachment; filename=document.pdf" : "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return new NextResponse("Error fetching PDF", { status: 500 });
  }
}
