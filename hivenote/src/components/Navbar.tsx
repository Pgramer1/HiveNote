import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav className="border-b px-6 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold">
        🐝 HiveNote
      </Link>

      <div className="flex items-center gap-4">
        <Link href="/resources">Resources</Link>

        {session ? (
          <>
            <Link href="/resources/upload">Upload</Link>
            <Link href="/my-uploads">My Uploads</Link>
            <Link href="/me" className="text-sm">My Profile</Link>

            <span className="text-sm text-gray-600">
              {session.user?.email}
            </span>

            <form action="/api/auth/signout" method="post">
              <button className="text-red-600">Logout</button>
            </form>
          </>
        ) : (
          <form action="/api/auth/signin" method="post">
            <button className="text-blue-600">Login</button>
          </form>
        )}
      </div>
    </nav>
  );
}
