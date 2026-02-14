"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Hexagon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found');
      return;
    }

    // Verify the email
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(async (data) => {
        if (data.success) {
          setStatus('success');
          setMessage('Your email has been verified! Redirecting to sign in...');
          
          // Redirect to sign in after 2 seconds
          setTimeout(() => {
            setSigningIn(true);
            router.push('/auth/signin');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('An error occurred during verification');
      });
  }, [token, router]);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
        <Hexagon className="w-6 h-6 text-primary" />
        <span>HiveNote</span>
      </Link>

      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            {status === 'loading' && <Loader2 className="w-16 h-16 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-16 h-16 text-green-500" />}
            {status === 'error' && <XCircle className="w-16 h-16 text-red-500" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                {signingIn ? 'Redirecting to sign in...' : 'You can now sign in to HiveNote!'}
              </p>
              {!signingIn && (
                <Button 
                  size="lg"
                  className="w-full font-semibold"
                  onClick={() => router.push('/auth/signin')}
                >
                  Continue to Sign In
                </Button>
              )}
            </>
          )}
          
          {status === 'error' && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Please try signing in again to request a new verification email.
              </p>
              <Button 
                size="lg"
                variant="outline"
                className="w-full font-semibold"
                onClick={() => router.push('/auth/signin')}
              >
                Back to Sign In
              </Button>
            </>
          )}

          {status === 'loading' && (
            <p className="text-center text-sm text-muted-foreground">
              Please wait while we verify your email...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
