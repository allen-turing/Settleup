"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  Activity,
  LogOut,
  ChevronRight,
  FolderPlus,
  HelpCircle,
  FileText,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  UserCircle
} from "lucide-react";

interface GroupSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  memberCount: number;
  userNetBalance: number;
  userTotalPaid: number;
  userTotalOwed: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface ExpenseUpdateNotification {
  hasUpdates: boolean;
  totalNewExpenses: number;
  updatesByGroup: Array<{ groupId: string; groupName: string; count: number }>;
  preview: Array<{
    id: string;
    title: string;
    paidByName: string;
    groupName: string;
    totalAmount: number;
    createdAt: string;
  }>;
  since: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expenseNotification, setExpenseNotification] = useState<ExpenseUpdateNotification | null>(null);

  // Create Group Form States
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

  // Audit import states (export is a plain link — no state needed)
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch current user
      const userRes = await fetch("/api/auth/me");
      if (!userRes.ok) {
        router.replace("/login");
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      // 2. Fetch groups
      const groupsRes = await fetch("/api/groups");
      if (!groupsRes.ok) {
        throw new Error("Failed to load groups.");
      }
      const groupsData = await groupsRes.json();
      setGroups(groupsData.groups);

      // 3. Fetch teammate expense updates since the last seen point
      const notifyRes = await fetch("/api/notifications/expense-updates?markAsSeen=true");
      if (notifyRes.ok) {
        const notifyData = await notifyRes.json();
        setExpenseNotification(notifyData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess(false);
    setCreateLoading(true);

    if (!newGroupName.trim()) {
      setCreateError("Group name is required.");
      setCreateLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create group.");
      }

      setCreateSuccess(true);
      setNewGroupName("");
      setNewGroupDesc("");

      // Refresh the groups list
      await fetchDashboardData();
    } catch (err: any) {
      setCreateError(err.message || "An error occurred.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Restore from a JSON audit file
  const handleImportAudit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      const res = await fetch("/api/audit/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");
      setImportResult({
        success: true,
        message: `Imported: ${data.imported.groups} groups, ${data.imported.expenses} expenses, ${data.imported.settlements} settlements.`,
      });
      await fetchDashboardData();
    } catch (err: any) {
      setImportResult({ success: false, message: err.message || "Failed to import audit file." });
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

  // Calculate dynamic summary stats

  const totalOwedMe = groups
    .filter((g) => g.userNetBalance > 0)
    .reduce((sum, g) => sum + g.userNetBalance, 0);

  const totalIOwe = groups
    .filter((g) => g.userNetBalance < 0)
    .reduce((sum, g) => sum + Math.abs(g.userNetBalance), 0);

  const netBalance = totalOwedMe - totalIOwe;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header bar */}
      <header className="w-full border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">PayPaySplit</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-right hidden sm:block group"
              title="Edit profile"
            >
              <div className="text-sm font-semibold text-white group-hover:text-purple-400 transition flex items-center gap-1.5 justify-end">
                <UserCircle className="h-3.5 w-3.5 text-zinc-500 group-hover:text-purple-400 transition" />
                {user?.name}
              </div>
              <div className="text-xs text-zinc-500 group-hover:text-zinc-400 transition">{user?.email}</div>
            </Link>
            {/* Audit Export — download attr forces correct filename on all browsers incl. Safari */}
            <a
              href="/api/audit/export"
              download={`settleup-audit-${new Date().toISOString().split("T")[0]}.json`}
              className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs font-semibold transition"
              title="Export Audit Snapshot"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Audit</span>
            </a>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
              title="Log Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-20">
            <div className="h-10 w-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-zinc-400">Loading your PayPaySplit dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Teammate expense updates since your previous visit */}
            {expenseNotification?.hasUpdates && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-cyan-200">
                      {expenseNotification.totalNewExpenses} new expense{expenseNotification.totalNewExpenses > 1 ? "s" : ""} added while you were away
                    </h3>
                    <p className="text-xs text-cyan-100/80 mt-1">
                      Since {new Date(expenseNotification.since).toLocaleString("en-IN")}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {expenseNotification.updatesByGroup.map((g) => (
                        <span
                          key={g.groupId}
                          className="text-[11px] px-2 py-1 rounded-full bg-zinc-900/70 border border-cyan-400/20 text-cyan-100"
                        >
                          {g.groupName}: {g.count}
                        </span>
                      ))}
                    </div>

                    {expenseNotification.preview.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {expenseNotification.preview.map((p) => (
                          <p key={p.id} className="text-xs text-zinc-300">
                            <span className="text-cyan-300 font-semibold">{p.paidByName}</span> added
                            <span className="text-white font-semibold"> {p.title}</span> in {p.groupName}
                            <span className="text-zinc-400"> (₹{p.totalAmount.toFixed(2)})</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Net Balance visualizer card */}
            <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
              {/* Dynamic colored glow backdrop according to balance state */}
              <div
                className={`absolute inset-0 opacity-10 blur-3xl pointer-events-none transition-all duration-500 ${netBalance > 0.005
                  ? "bg-emerald-500"
                  : netBalance < -0.005
                    ? "bg-rose-500"
                    : "bg-purple-600"
                  }`}
              />

              <div className="space-y-2 text-center md:text-left z-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Overall Balance Status</p>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white">
                  {netBalance > 0.005 ? (
                    <span className="text-emerald-400">+₹{netBalance.toFixed(2)}</span>
                  ) : netBalance < -0.005 ? (
                    <span className="text-rose-400">-₹{Math.abs(netBalance).toFixed(2)}</span>
                  ) : (
                    <span className="text-zinc-400">₹0.00</span>
                  )}
                </h2>
                <p className="text-sm text-zinc-400">
                  {netBalance > 0.005
                    ? "Excellent! You are owed money overall."
                    : netBalance < -0.005
                      ? "Take note. You owe money overall."
                      : "Fantastic! You are fully settled up."}
                </p>
              </div>

              {/* Stats Split Columns */}
              <div className="flex gap-4 sm:gap-8 w-full md:w-auto justify-center z-10">
                <div className="px-6 py-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4 text-left">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Owed to me</p>
                    <p className="text-lg font-bold text-emerald-400">₹{totalOwedMe.toFixed(2)}</p>
                  </div>
                </div>

                <div className="px-6 py-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4 text-left">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider">I owe others</p>
                    <p className="text-lg font-bold text-rose-400">₹{totalIOwe.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Page Layout: Groups list vs Create Group form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Groups listing column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-400" />
                    My Groups & Trips
                  </h3>
                  <span className="text-xs text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
                    {groups.length} active
                  </span>
                </div>

                {groups.length === 0 ? (
                  <div className="glass-card rounded-2xl p-12 text-center flex flex-col justify-center items-center">
                    <div className="h-14 w-14 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
                      <Users className="h-7 w-7" />
                    </div>
                    <h4 className="text-white font-semibold text-base mb-1">No Groups Yet</h4>
                    <p className="text-zinc-400 text-sm max-w-sm mb-6">
                      Get started by creating a group for flat bills, office lunches, or trips with friends using the form!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groups.map((group) => (
                      <Link
                        key={group.id}
                        href={`/groups/${group.id}`}
                        className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:scale-[1.02] cursor-pointer group"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="text-white font-bold group-hover:text-purple-300 transition-colors text-base truncate">
                              {group.name}
                            </h4>
                            <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-purple-400 transition" />
                          </div>
                          <p className="text-zinc-400 text-xs line-clamp-2 h-8 leading-relaxed">
                            {group.description || "No description provided."}
                          </p>
                        </div>

                        {/* Card metadata footer */}
                        <div className="border-t border-white/5 pt-4 mt-4 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Users className="h-3.5 w-3.5" />
                            <span>{group.memberCount} members</span>
                          </div>

                          <div className="text-right">
                            {group.userNetBalance > 0.005 ? (
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                                +₹{group.userNetBalance.toFixed(2)}
                              </span>
                            ) : group.userNetBalance < -0.005 ? (
                              <span className="text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded">
                                -₹{Math.abs(group.userNetBalance).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                                Settled
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Group Form Column */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-purple-400" />
                  Create a Group
                </h3>

                <div className="glass-card rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <h4 className="text-sm font-semibold text-white mb-4">Start a new expense circle</h4>

                  {createError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                      {createError}
                    </div>
                  )}

                  {createSuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400">
                      Group created successfully!
                    </div>
                  )}

                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <label htmlFor="groupName" className="block text-xs font-medium text-zinc-400 mb-2">
                        Group Name
                      </label>
                      <input
                        id="groupName"
                        type="text"
                        required
                        placeholder="e.g. Goa Trip, Flat Expenses"
                        value={newGroupName}
                        onChange={(e) => {
                          setNewGroupName(e.target.value);
                          setCreateSuccess(false);
                        }}
                        disabled={createLoading}
                        className="w-full px-3.5 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 transition duration-200"
                      />
                    </div>

                    <div>
                      <label htmlFor="groupDesc" className="block text-xs font-medium text-zinc-400 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        id="groupDesc"
                        rows={3}
                        placeholder="What is this group for?"
                        value={newGroupDesc}
                        onChange={(e) => {
                          setNewGroupDesc(e.target.value);
                          setCreateSuccess(false);
                        }}
                        disabled={createLoading}
                        className="w-full px-3.5 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 transition duration-200 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={createLoading}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-sm font-semibold text-white rounded-lg shadow cursor-pointer transition-all duration-200"
                    >
                      {createLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Create Group
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Audit Export Card */}
                <div className="glass-card rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-purple-500 to-blue-500 pointer-events-none" />
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-purple-400" />
                    Audit Snapshot
                  </h4>
                  <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
                    Export a complete JSON record of all your groups, expenses, settlements, and members. Use it to migrate, backup, or recreate the full state on a fresh database.
                  </p>
                  <a
                    href="/api/audit/export"
                    download={`settleup-audit-${new Date().toISOString().split("T")[0]}.json`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600 hover:border-purple-500 text-purple-300 hover:text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Audit JSON
                  </a>

                  {/* Divider */}
                  <div className="border-t border-white/5 my-4" />

                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                    <Upload className="h-4 w-4 text-blue-400" />
                    Restore from Audit
                  </h4>
                  <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                    Upload a previously exported JSON file to idempotently recreate all data on this instance.
                  </p>

                  {importResult && (
                    <div className={`mb-3 p-2.5 rounded-lg text-[11px] flex items-start gap-2 ${importResult.success
                      ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/25 text-red-400"
                      }`}>
                      {importResult.success
                        ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        : <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                      <span>{importResult.message}</span>
                    </div>
                  )}

                  <label className={`w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold transition cursor-pointer border ${importLoading
                    ? "bg-zinc-900 border-zinc-800 text-zinc-500 opacity-50 pointer-events-none"
                    : "bg-blue-600/15 border-blue-500/25 hover:bg-blue-600 hover:border-blue-500 text-blue-300 hover:text-white"
                    }`}>
                    {importLoading ? (
                      <div className="h-3.5 w-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {importLoading ? "Importing..." : "Upload Audit JSON"}
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportAudit}
                      disabled={importLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
