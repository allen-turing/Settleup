"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Pencil,
  LogOut,
  Coins,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  upiId: string | null;
  createdAt: string;
  hasPassword?: boolean;
}

type Status = { type: "success" | "error"; message: string } | null;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Info form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [upiId, setUpiId] = useState("");
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoStatus, setInfoStatus] = useState<Status>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwStatus, setPwStatus] = useState<Status>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) { router.replace("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setUser(data.user);
        setName(data.user.name);
        setEmail(data.user.email);
        setUpiId(data.user.upiId || "");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleInfoSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setInfoLoading(true);
    setInfoStatus(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, upiId: upiId.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");
      setUser(data.user);
      setName(data.user.name);
      setEmail(data.user.email);
      setUpiId(data.user.upiId || "");
      setInfoStatus({ type: "success", message: "Profile updated successfully!" });
    } catch (err: any) {
      setInfoStatus({ type: "error", message: err.message });
    } finally {
      setInfoLoading(false);
    }
  }

  async function handlePasswordSave(e: React.SyntheticEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwStatus({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwStatus({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    setPwLoading(true);
    setPwStatus(null);
    try {
      const payload: Record<string, string> = { newPassword };
      if (user?.hasPassword) {
        payload.currentPassword = currentPassword;
      }
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");
      setPwStatus({ type: "success", message: "Password changed successfully!" });
      if (data.user) {
        setUser(data.user);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwStatus({ type: "error", message: err.message });
    } finally {
      setPwLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const isInfoChanged = user && (
    name.trim() !== user.name || 
    email.trim().toLowerCase() !== user.email ||
    (upiId.trim() || null) !== (user.upiId || null)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white">My Profile</h1>
              <p className="text-[11px] text-zinc-500">Manage your account details</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span className="hidden sm:inline">
                Member since{" "}
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
                  : "—"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Avatar / identity banner */}
        <div className="glass-card rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/5 pointer-events-none" />
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl font-extrabold text-white shadow-lg shadow-purple-500/20 flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user?.name}</h2>
            <p className="text-sm text-zinc-500">{user?.email}</p>
          </div>
        </div>

        {/* Account Info Card */}
        <div className="glass-card rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
            <Pencil className="h-4 w-4 text-purple-400" />
            Account Information
          </h3>

          {infoStatus && (
            <div
              className={`mb-4 p-3 rounded-xl text-sm flex items-start gap-2 ${
                infoStatus.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/25 text-red-400"
              }`}
            >
              {infoStatus.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              {infoStatus.message}
            </div>
          )}

          <form onSubmit={handleInfoSave} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setInfoStatus(null); }}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition"
                  placeholder="Your full name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="profile-email" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                <input
                  id="profile-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setInfoStatus(null); }}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* UPI ID */}
            <div>
              <label htmlFor="profile-upi" className="block text-xs font-medium text-zinc-400 mb-1.5 flex justify-between">
                <span>UPI ID</span>
                <span className="text-[10px] text-zinc-500 font-normal">Optional — for quick settlement payments</span>
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                <input
                  id="profile-upi"
                  type="text"
                  value={upiId}
                  onChange={(e) => { setUpiId(e.target.value); setInfoStatus(null); }}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition"
                  placeholder="e.g. john@okhdfcbank"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={infoLoading || !isInfoChanged}
              className="flex items-center gap-2 py-2.5 px-5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition cursor-pointer shadow shadow-purple-500/20"
            >
              {infoLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {infoLoading ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="glass-card rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4 text-blue-400" />
            Change Password
          </h3>

          {pwStatus && (
            <div
              className={`mb-4 p-3 rounded-xl text-sm flex items-start gap-2 ${
                pwStatus.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/25 text-red-400"
              }`}
            >
              {pwStatus.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              {pwStatus.message}
            </div>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            {/* Current Password / Info Note */}
            {user?.hasPassword ? (
              <div>
                <label htmlFor="current-password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                  <input
                    id="current-password"
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPwStatus(null); }}
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition"
                    placeholder="Your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-300/90 leading-relaxed font-semibold">
                You logged in using Google and don't have a password set yet. Add a password below to enable standard email/password login.
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPwStatus(null); }}
                  className="w-full pl-9 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= i * 3
                          ? i <= 1 ? "bg-red-500" : i <= 2 ? "bg-amber-500" : i <= 3 ? "bg-yellow-400" : "bg-emerald-500"
                          : "bg-zinc-800"
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-zinc-500 ml-1">
                    {newPassword.length < 4 ? "Weak" : newPassword.length < 7 ? "Fair" : newPassword.length < 10 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus(null); }}
                  className={`w-full pl-9 pr-10 py-2.5 bg-zinc-900/60 border rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition focus:ring-1 ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                      : "border-zinc-800 focus:border-blue-500/50 focus:ring-blue-500/20"
                  }`}
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pwLoading || (user?.hasPassword && !currentPassword) || !newPassword || !confirmPassword}
              className="flex items-center gap-2 py-2.5 px-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition cursor-pointer shadow shadow-blue-500/20"
            >
              {pwLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {pwLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
