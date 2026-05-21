import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ArrowRight, DollarSign, Users, Award, Shield, CheckCircle } from "lucide-react";
import FeatureRequestWorkflow from "@/components/FeatureRequestWorkflow";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const user = token ? await verifyToken(token) : null;
  const isAuthenticated = !!user;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">PayPaySplit</span>
        </Link>
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1 py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold text-sm text-white shadow-lg shadow-purple-500/20 transition-all duration-200"
            >
              Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="py-2 px-4 rounded-lg font-semibold text-sm text-zinc-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="py-2 px-4 rounded-lg bg-white hover:bg-zinc-100 font-semibold text-sm text-black transition-all duration-200"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-4xl mx-auto relative">
        {/* Glow backdrop blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-white mb-6 animate-fade-in">
          The Premium Way to <br />
          <span className="gradient-text">Share Expenses</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          PayPaySplit helps you track trips, flat expenses, and shared bills. Stop worrying about who owes whom. Let our intelligent greedy algorithm settle all circular debts instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-base text-white shadow-xl shadow-purple-600/35 transition-all duration-200"
            >
              Go to your Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-base text-white shadow-xl shadow-purple-600/35 transition-all duration-200"
              >
                Start Splitting Bills
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center py-3.5 px-8 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 font-semibold text-base text-white transition-all duration-200"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-10">
          <div className="glass-card rounded-2xl p-6 text-left relative overflow-hidden">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Flexible Groups</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Create trips, flatshares, or office lunches. Invite friends instantly via email. Let PayPaySplit manage everything.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-left relative overflow-hidden">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-4">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Greedy Debt Simplification</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              No more circular payments. Our advanced algorithm greedily calculates the absolute minimum transactions needed to settle up.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-left relative overflow-hidden">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Precise Money Split</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Split equally, unequally, by percentages, or shares. Dynamic fraction remainder distribution guarantees every penny adds up perfectly.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Request Workflow */}
      <FeatureRequestWorkflow defaultEmail={user?.email || ""} />

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 gap-4 mt-auto">
        <div>&copy; {new Date().getFullYear()} PayPaySplit. All rights reserved.</div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-zinc-300">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-zinc-300">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
