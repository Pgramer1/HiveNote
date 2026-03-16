import Link from "next/link";
import { getSession } from "@/lib/auth";
import ThemeToggle from "@/components/ui/ThemeToggle";
import MobileMenu from "@/components/layout/MobileMenu";
import { Heart, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function Navbar() {
  const session = await getSession();
  
  // Check if user is a university student
  const isUniversityStudent = session?.user?.email 
    ? (await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isUniversityEmail: true },
      }))?.isUniversityEmail || false
    : false;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
          <Image src="/bee (1).svg" alt="HiveNote Logo" width={32} height={32} className="w-8 h-8" />
          <span>HiveNote</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {session ? (
            <>
              {isUniversityStudent && (
                <Link href="/university" className="text-base font-medium hover:text-primary transition-colors flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  My University
                </Link>
              )}
              <Link href="/resources/upload" className="text-base font-medium hover:text-primary transition-colors">
                Upload
              </Link>
              <Link href="/my-favorites" className="text-base font-medium hover:text-primary transition-colors flex items-center gap-1">
                <Heart className="w-4 h-4" />
                Favorites
              </Link>

              <ThemeToggle />

              <Link href="/me" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border-2 border-primary/20 hover:border-primary/50 transition-colors">
                  <Image
                    src={getAvatarUrl(session.user?.email || "user")}
                    alt={session.user?.name || "User avatar"}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
            </>
          ) : (
            <>
              <ThemeToggle />
              <form action="/api/auth/signin" method="post">
                <Button size="sm">
                  Login
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-4">
          <ThemeToggle />
          <MobileMenu isLoggedIn={!!session} isUniversityStudent={isUniversityStudent} />
        </div>
      </div>
    </nav>
  );
}
