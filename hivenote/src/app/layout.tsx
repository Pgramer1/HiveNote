import "./globals.css";
import Navbar from "@/components/Navbar";
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="max-w-4xl mx-auto">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
