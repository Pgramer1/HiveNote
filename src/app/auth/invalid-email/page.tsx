"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Hexagon, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InvalidEmailPage() {
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
            <AlertCircle className="w-16 h-16 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Invalid Email Address
          </CardTitle>
          <CardDescription>
            University email required
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            HiveNote is exclusively for university students and staff. Please use a valid university email address to sign up.
          </p>
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs font-medium mb-2">Accepted email formats:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>.edu (e.g., student@university.edu)</li>
              <li>.ac.uk (e.g., student@university.ac.uk)</li>
              <li>.edu.au, .edu.in, .ac.in (and other university domains)</li>
            </ul>
          </div>
          <Button 
            size="lg"
            className="w-full font-semibold"
            onClick={() => router.push('/auth/signin')}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
