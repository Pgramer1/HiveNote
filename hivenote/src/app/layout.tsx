import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";


export const metadata = {
  title: "HiveNote",
  description: "Centralized learning resources for students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            🐝 HiveNote
          </Link>

          <div className="space-x-4">
            <Link href="/resources" className="hover:underline">
              Resources
            </Link>
          </div>
        </nav>
        <Providers>
          <main className="max-w-4xl mx-auto">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
