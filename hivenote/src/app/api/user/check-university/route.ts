import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ isUniversityEmail: false });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isUniversityEmail: true },
    });

    return NextResponse.json({ 
      isUniversityEmail: user?.isUniversityEmail || false 
    });
  } catch (error) {
    return NextResponse.json({ isUniversityEmail: false });
  }
}
