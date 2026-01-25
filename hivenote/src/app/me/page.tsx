import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function MePage() {
  const session = await getSession();

  // 🔐 Must be logged in
  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/api/auth/signin");
  }

  // Redirect to public profile
  redirect(`/users/${user.id}`);
}
