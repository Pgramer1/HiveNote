"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Hexagon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function SignOutContent() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
        <Hexagon className="w-6 h-6 text-primary" />
        <span>HiveNote</span>
      </Link>

      <Card className="w-full max-w-sm border shadow-sm">
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
