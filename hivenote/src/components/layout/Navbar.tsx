import Link from "next/link";
import { getSession } from "@/lib/auth";
import ThemeToggle from "@/components/ui/ThemeToggle";
import MobileMenu from "@/components/layout/MobileMenu";
import { Hexagon } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
          <Hexagon className="w-6 h-6 text-primary" />
          <span>HiveNote</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/resources" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
            Resources
          </Link>

          {session ? (
            <>
              <Link href="/resources/upload" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
                Upload
              </Link>
              <Link href="/me" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
                My Profile
              </Link>

              <form action="/api/auth/signout" method="post">
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <form action="/api/auth/signin" method="post">
              <Button size="sm">
                Login
              </Button>
            </form>
          )}
          
          <ThemeToggle />
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
