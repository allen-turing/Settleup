"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col justify-center items-center py-20 min-h-screen">
        <div className="h-10 w-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Loading signup...</p>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [upiId, setUpiId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const groupId = searchParams.get("group");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, upiId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed. Try again.");
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
            Split expenses, simplify settlements, and track balances.
          </p>
        </div>

        {/* Signup frosted card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

          <h2 className="text-xl font-semibold text-white mb-6">Create a new account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-zinc-400 mb-2">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 transition-all duration-200"
                />
              </div>
            </div>

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

            <div>
              <label htmlFor="upiId" className="block text-xs font-medium text-zinc-400 mb-2">
                UPI ID (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <span className="text-[11px] font-bold text-zinc-500">UPI</span>
                </div>
                <input
                  id="upiId"
                  type="text"
                  placeholder="username@bank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 transition-all duration-200"
                />
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
                  Register
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs">
            <span className="text-zinc-500">Already registered?</span>{" "}
            <Link
              href={groupId ? `/login?group=${groupId}` : "/login"}
              className="text-purple-400 font-medium hover:text-purple-300 hover:underline transition"
            >
              Log in instead
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
