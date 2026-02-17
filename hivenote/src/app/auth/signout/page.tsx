"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Hexagon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";

function SignOutContent() {
  const [beePositions, setBeePositions] = useState<Array<{ left: number; top: number; duration: number; delay: number; path: number }>>([]);

  // Generate random bee positions only on client side to avoid hydration errors
  useEffect(() => {
    setBeePositions(
      Array.from({ length: 8 }, (_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 12 + Math.random() * 8,
        delay: i * 1.5,
        path: Math.floor(Math.random() * 3), // 0, 1, or 2 for different animation paths
      }))
    );
  }, []);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-500 relative overflow-hidden">
      {/* Animated floating bees background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {beePositions.map((bee, i) => (
          <div
            key={i}
            className={`absolute animate-float-bee-${bee.path}`}
            style={{
              left: `${bee.left}%`,
              top: `${bee.top}%`,
              animationDelay: `${bee.delay}s`,
              animationDuration: `${bee.duration}s`,
            }}
          >
            <div className="relative">
              {/* Yellow trail effect */}
              <div className="absolute inset-0 blur-xl bg-yellow-400/30 animate-pulse" style={{ animationDelay: `${bee.delay * 0.3}s` }}></div>
              {/* Bee SVG */}
              <img 
                src="/bee (1).svg" 
                alt="" 
                className="w-12 h-12 relative z-10 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                style={{ 
                  filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.8))',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity z-10">
        <Hexagon className="w-6 h-6 text-primary" />
        <span>HiveNote</span>
      </Link>

      <Card className="w-full max-w-sm border shadow-sm relative z-10">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Sign out</CardTitle>
          <CardDescription>
            Are you sure you want to sign out of your account?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            size="lg" 
            className="w-full font-semibold relative" 
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Go back
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignOutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SignOutContent />
        </Suspense>
    )
}
