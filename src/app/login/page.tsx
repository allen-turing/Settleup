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

  const handleSubmit = async (e: React.SyntheticEvent) => {
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

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-zinc-800/60" />
            <span className="mx-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Or continue with
            </span>
            <div className="flex-1 border-t border-zinc-800/60" />
          </div>

          <a
            href={groupId ? `/api/auth/google?group=${groupId}` : "/api/auth/google"}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#131314] hover:bg-[#202124] active:bg-[#303134] border border-[#8e918f]/30 text-sm font-medium text-[#e3e3e3] rounded-lg shadow-md transition-all duration-200 cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
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
