"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Hexagon, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to send reset email' });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Password reset link sent! Please check your email.' 
        });
        setEmail("");
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
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

      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-slate-800 via-slate-900 to-zinc-900 p-12 flex-col justify-between relative overflow-hidden z-10">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-500 rounded-full blur-3xl"></div>
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 font-bold text-2xl text-white hover:opacity-80 transition-opacity z-10">
          <Hexagon className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
          <span>HiveNote</span>
        </Link>

        {/* Center Illustration */}
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="relative">
            <div className="w-64 h-64 rounded-full bg-linear-to-br from-yellow-400/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center">
              <Mail className="w-32 h-32 text-yellow-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="z-10 text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Reset Your Password</h2>
          <p className="text-slate-300">We'll send you a secure link to reset your password</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-6 animate-in fade-in slide-in-from-right duration-500">
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden flex items-center justify-center gap-2 font-bold text-xl text-slate-900 dark:text-white">
            <Hexagon className="w-6 h-6 text-yellow-500" />
            <span>HiveNote</span>
          </Link>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Mail className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forgot Password?</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                University Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="yourname@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm animate-in slide-in-from-top ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' 
                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <Button 
              type="submit"
              className="w-full h-11 bg-linear-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900 font-semibold shadow-lg shadow-yellow-500/30"
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <Link 
              href="/auth/signin" 
              className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
