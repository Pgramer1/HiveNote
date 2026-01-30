import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  
  return NextResponse.json({
    hasSession: !!session,
    user: session?.user ? {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    } : null,
  });
}
