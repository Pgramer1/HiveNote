"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Hexagon, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
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

  // Handle sign up (email verification)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate passwords
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to send verification email' });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Verification email sent! Please check your inbox and click the verification link.' 
        });
        setEmail("");
        setName("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in (credentials)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        router.push(callbackUrl);
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
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-500 rounded-full blur-3xl"></div>
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 font-bold text-2xl text-white hover:opacity-80 transition-opacity z-10">
          <Hexagon className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
          <span>HiveNote</span>
        </Link>

        {/* Bee Illustration Area */}
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="relative">
            {/* Main honeycomb circle */}
            <div className="relative w-64 h-64 group">
              <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-linear-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-yellow-500/50 group-hover:scale-110 transition-transform duration-300">
                  <Hexagon className="w-16 h-16 text-slate-900 fill-slate-900/20" />
                </div>
              </div>
              
              {/* Floating hexagons */}
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400/20 backdrop-blur-sm rounded-lg flex items-center justify-center animate-pulse">
                <Hexagon className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center animate-pulse delay-75">
                <Hexagon className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            {/* Decorative bee path */}
            <div className="absolute top-0 right-0 w-20 h-20 -mr-12">
              <svg viewBox="0 0 80 80" className="w-full h-full text-yellow-400 opacity-50">
                <path d="M 10 40 Q 40 10, 70 40 T 130 40" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 4">
                  <animate attributeName="stroke-dashoffset" from="0" to="8" dur="1s" repeatCount="indefinite" />
                </path>
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="z-10 text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Welcome to HiveNote</h2>
          <p className="text-slate-300">Your collaborative learning platform for university students</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 animate-in fade-in slide-in-from-right duration-500">
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden flex items-center justify-center gap-2 font-bold text-xl">
            <Hexagon className="w-6 h-6 text-yellow-500" />
            <span>HiveNote</span>
          </Link>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {isSignUp ? 'Create Account' : 'Log In'}
            </h1>
            <p className="text-sm text-slate-600">
              {isSignUp 
                ? 'Sign up with your university email'
                : 'Enter your credentials to access your account'
              }
            </p>
          </div>

          {/* Tab Switcher - Compact */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setMessage(null);
                setPassword("");
                setConfirmPassword("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                !isSignUp
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setMessage(null);
                setPassword("");
                setConfirmPassword("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                isSignUp
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign Up Form */}
          {isSignUp ? (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Name (optional)
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="h-11"
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                University Email <span className="text-red-500">*</span>
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

            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={loading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={loading}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full h-11 bg-linear-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900 font-semibold shadow-lg shadow-yellow-500/30"
              disabled={loading || !email || !password || !confirmPassword}
            >
              {loading ? 'Sending...' : 'Send Verification Email'}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Your password will be set after email verification
            </p>
          </form>
          ) : (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="signin-email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="yourname@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={loading}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                  Remember me
                </label>
              </div>

              <Button 
                type="submit"
                className="w-full h-11 bg-linear-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900 font-semibold shadow-lg shadow-yellow-500/30"
                disabled={loading || !email || !password}
              >
                {loading ? 'Signing In...' : 'Login'}
              </Button>
            </form>
          )}

          {/* Messages */}
          {message && (
            <div className={`p-3 rounded-lg text-sm animate-in slide-in-from-top ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : message.type === 'info'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Footer Text */}
          <div className="text-center text-xs text-slate-500">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setMessage(null);
                  }}
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                New user?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setMessage(null);
                  }}
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Create an account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SignInContent />
        </Suspense>
    )
}
