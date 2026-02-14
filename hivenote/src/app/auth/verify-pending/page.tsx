"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Hexagon, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VerifyPendingPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
        <Hexagon className="w-6 h-6 text-primary" />
        <span>HiveNote</span>
      </Link>

      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <Mail className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Check Your Email
          </CardTitle>
          <CardDescription>
            We've sent you a verification link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Please check your university email inbox and click on the verification link to complete your registration.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            The link will expire in 24 hours.
          </p>
          <div className="pt-2">
            <Button 
              size="lg"
              variant="outline"
              className="w-full font-semibold"
              onClick={() => router.push('/auth/signin')}
            >
              Back to Sign In
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Didn't receive an email? Check your spam folder or try signing in again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
