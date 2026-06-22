"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col justify-center items-center py-20 min-h-screen">
        <div className="h-10 w-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Loading login...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(urlError || "");
  const [loading, setLoading] = useState(false);

  const groupId = searchParams.get("group");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed. Check credentials.");
      }

      // Auto-join the group if invited via query link
      if (groupId) {
        try {
          const joinRes = await fetch(`/api/groups/${groupId}/join`, {
            method: "POST",
          });
          if (joinRes.ok) {
            router.replace(`/groups/${groupId}`);
            router.refresh();
            return;
          }
        } catch (joinErr) {
          console.error("Auto-joining group failed:", joinErr);
        }
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* App Logo/Header */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <img src="/logo.png" alt="PayPaySplit Logo" className="h-16 w-16 rounded-2xl shadow-xl shadow-purple-500/20 object-cover mb-4 border border-purple-500/10" />
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="gradient-text">PayPaySplit</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Settle balances, split bills, and live stress-free.
          </p>
        </div>

        {/* Login frosted card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle design gradient dot inside card */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

          <h2 className="text-xl font-semibold text-white mb-6">Log in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-sm font-semibold text-white rounded-lg shadow-lg cursor-pointer transition-all duration-200 mt-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800/80" />
            </div>
            <span className="relative px-3 bg-[#0d0d12] text-xs text-zinc-500 uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          <a
            href={groupId ? `/api/auth/google?group=${groupId}` : "/api/auth/google"}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-900/60 hover:bg-zinc-800/60 active:bg-zinc-950/60 border border-zinc-800/60 text-sm font-semibold text-white rounded-lg shadow-md transition-all duration-200 cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.43c0,-0.68 -0.06,-1.33 -0.17,-1.95z" fill="#4285F4" />
              <path d="M12,20.67c2.61,0 4.8,-0.87 6.4,-2.36l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.1,0.98c-3.15,0 -5.82,-2.13 -6.78,-5H1.83v2.67c1.64,3.26 5.01,5.29 8.97,5.29z" fill="#34A853" />
              <path d="M5.22,11.71c-0.24,-0.72 -0.38,-1.49 -0.38,-2.28c0,-0.79 0.14,-1.56 0.38,-2.28V4.48H1.83c-0.8,1.6 -1.25,3.39 -1.25,5.28c0,1.89 0.45,3.68 1.25,5.28l3.39,-2.67z" fill="#FBBC05" />
              <path d="M12,4.83c1.42,0 2.7,0.49 3.7,1.44l2.77,-2.77C16.8,1.96 14.61,1.09 12,1.09c-3.96,0 -7.33,2.03 -8.97,5.29l3.39,2.67c0.96,-2.87 3.63,-5 6.78,-5z" fill="#EA4335" />
            </svg>
            Continue with Google
          </a>

          <div className="mt-6 text-center text-xs">
            <span className="text-zinc-500">New to PayPaySplit?</span>{" "}
            <Link
              href={groupId ? `/signup?group=${groupId}` : "/signup"}
              className="text-purple-400 font-medium hover:text-purple-300 hover:underline transition"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
