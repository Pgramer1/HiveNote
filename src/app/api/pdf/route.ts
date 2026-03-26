import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isUniversityEmail: true, university: true },
  });

  if (!user?.isUniversityEmail) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const resourceId = request.nextUrl.searchParams.get("resourceId");
  const download = request.nextUrl.searchParams.get("download") === "true";

  if (!resourceId) {
    return new NextResponse("Missing resourceId parameter", { status: 400 });
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { fileUrl: true, type: true, university: true },
    });

    if (!resource) {
      return new NextResponse("Resource not found", { status: 404 });
    }

    if (resource.type !== "PDF") {
      return new NextResponse("Invalid resource type", { status: 400 });
    }

    if (resource.university && user.university && resource.university !== user.university) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const response = await fetch(resource.fileUrl);
    
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
