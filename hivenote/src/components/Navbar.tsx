import Link from "next/link";
import { getSession } from "@/lib/auth";
import ThemeToggle from "./ThemeToggle";
import MobileMenu from "./MobileMenu";

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center bg-white dark:bg-gray-900 transition-colors top-0 z-50 shadow-sm relative">
      <Link href="/" className="text-xl font-bold hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white">
        🐝 HiveNote
      </Link>

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-6">
        <Link href="/resources" className="hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white">
          Resources
        </Link>

        {session ? (
          <>
            <Link href="/resources/upload" className="hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white">
              Upload
            </Link>
            <Link href="/me" className="hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white">
              My Profile
            </Link>

            <form action="/api/auth/signout" method="post">
              <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition">
                Logout
              </button>
            </form>
          </>
        ) : (
          <form action="/api/auth/signin" method="post">
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
              Login
            </button>
          </form>
        )}
        
        <ThemeToggle />
      </div>

      {/* Mobile Menu */}
      <div className="flex md:hidden items-center gap-4">
        <ThemeToggle />
        <MobileMenu isLoggedIn={!!session} />
      </div>
    </nav>
  );
}
