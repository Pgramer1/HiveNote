import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ResourcesPage() {
  const session = await getSession();
  
  // Redirect university students to their university page
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isUniversityEmail: true },
    });
    
    if (user?.isUniversityEmail) {
      redirect("/university");
    }
  }
  
  // For non-university users, redirect to home
  redirect("/");
}
