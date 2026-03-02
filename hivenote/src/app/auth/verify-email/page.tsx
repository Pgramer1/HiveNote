"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Hexagon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'already-verified'>('idle');
  const [message, setMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const hasVerified = useRef(false);

  // Show error immediately if no token present
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found');
    }
  }, [token]);

  const handleVerify = async () => {
    if (!token || hasVerified.current) return;
    hasVerified.current = true;
    setStatus('loading');

    try {
      const res = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage('Your email has been verified! You can now sign in.');
        setTimeout(() => {
          setSigningIn(true);
          router.push('/auth/signin');
        }, 2000);
      } else if (data.alreadyVerified) {
        setStatus('already-verified');
        setMessage('Your email has already been verified. You can sign in now.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
        <Hexagon className="w-6 h-6 text-primary" />
        <span>HiveNote</span>
      </Link>

      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            {status === 'idle' && <CheckCircle2 className="w-16 h-16 text-primary" />}
            {status === 'loading' && <Loader2 className="w-16 h-16 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-16 h-16 text-green-500" />}
            {status === 'already-verified' && <CheckCircle2 className="w-16 h-16 text-green-500" />}
            {status === 'error' && <XCircle className="w-16 h-16 text-red-500" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {status === 'idle' && 'Confirm Your Email'}
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'already-verified' && 'Already Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'idle'
              ? 'Click the button below to confirm and verify your email address.'
              : message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                This confirms that you own this email address and activates your HiveNote account.
              </p>
              <Button
                size="lg"
                className="w-full font-semibold"
                onClick={handleVerify}
              >
                Verify my Email
              </Button>
            </>
          )}

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

          {status === 'already-verified' && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                This verification link has already been used. Your account is verified and ready to use.
              </p>
              <Button 
                size="lg"
                className="w-full font-semibold"
                onClick={() => router.push('/auth/signin')}
              >
                Sign In
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                This link may have expired or already been used. If your email is already verified, you can sign in directly.
              </p>
              <Button 
                size="lg"
                className="w-full font-semibold"
                onClick={() => router.push('/auth/signin')}
              >
                Go to Sign In
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
