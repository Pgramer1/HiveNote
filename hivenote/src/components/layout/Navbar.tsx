import Link from "next/link";
import { getSession } from "@/lib/auth";
import ThemeToggle from "@/components/ui/ThemeToggle";
import MobileMenu from "@/components/layout/MobileMenu";
import { Hexagon, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
          <Hexagon className="w-6 h-6 text-primary" />
          <span>HiveNote</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/resources" className="text-base font-medium hover:text-primary transition-colors">
            Resources
          </Link>

          {session ? (
            <>
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
          <MobileMenu isLoggedIn={!!session} />
        </div>
      </div>
    </nav>
  );
}
