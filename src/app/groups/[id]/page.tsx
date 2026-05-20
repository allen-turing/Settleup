"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Plus,
  ArrowRight,
  Utensils,
  Bed,
  Fuel as FuelIcon,
  ShoppingBag,
  Ticket,
  Tv,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Trash2,
  Calendar,
  AlertCircle,
  PieChart,
  BarChart,
  UserPlus,
  ArrowRightLeft,
  X,
  CreditCard,
  Edit2,
  Mail,
  Copy,
  LogOut,
  UserCircle
} from "lucide-react";

// Category mappings for premium badges
const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  Utensils: { icon: Utensils, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  Bed: { icon: Bed, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  Fuel: { icon: FuelIcon, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  ShoppingBag: { icon: ShoppingBag, color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  Ticket: { icon: Ticket, color: "bg-red-500/10 text-red-400 border-red-500/20" },
  Tv: { icon: Tv, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  HelpCircle: { icon: HelpCircle, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

interface Member {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
}

interface ExpenseParticipant {
  userId: string;
  shareAmount: string;
  percentage?: string;
  shares?: number;
  user: { name: string };
}

interface Expense {
  id: string;
  title: string;
  description: string;
  totalAmount: string;
  paidById: string;
  paidBy: { name: string; email: string };
  category: { id: string; name: string; icon: string; color: string };
  splitType: string;
  expenseDate: string;
  receiptUrl?: string;
  participants: ExpenseParticipant[];
}

interface Settlement {
  id: string;
  paidById: string;
  paidToId: string;
  paidBy: { name: string };
  paidTo: { name: string };
  amount: string;
  settlementDate: string;
  note?: string;
}

interface MemberBalance {
  userId: string;
  userName: string;
  email: string;
  netBalance: number;
  totalPaid: number;
  totalOwed: number;
}

interface SimplifiedTransaction {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

interface AnalyticsData {
  totalSpend: number;
  categoryBreakdown: { name: string; icon: string; color: string; totalSpend: number; percentage: number }[];
  monthlyTimeline: { month: string; amount: number }[];
  contributionsBreakdown: { userId: string; name: string; paid: number; owed: number }[];
}

export default function GroupDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [currentUser, setCurrentUser] = useState<{ id: string; userId: string; name: string; email: string } | null>(null);
  const [group, setGroup] = useState<{ id: string; name: string; description: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [simplifiedTxs, setSimplifiedTxs] = useState<SimplifiedTransaction[]>([]);
  const [invitations, setInvitations] = useState<{ id: string; email: string; invitedAt: string }[]>([]);
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [viewTab, setViewTab] = useState<"expenses" | "analytics">("expenses");
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Invite Member States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Modals Toggles
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  // Add Expense States
  const [expTitle, setExpTitle] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPayer, setExpPayer] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expSplitType, setExpSplitType] = useState("EQUAL");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [expParticipants, setExpParticipants] = useState<Record<string, { checked: boolean; value: string }>>({});
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState("");

  // Custom Category States
  const [isCreatingCustomCategory, setIsCreatingCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategoryLoading, setCustomCategoryLoading] = useState(false);
  const [customCategoryError, setCustomCategoryError] = useState("");

  // Settle Up States
  const [settlePayer, setSettlePayer] = useState("");
  const [settleReceiver, setSettleReceiver] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split("T")[0]);
  const [settleNote, setSettleNote] = useState("");
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState("");

  // Inline delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupDetails();
    fetchCategories();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser({
          id: meData.user.id,
          userId: meData.user.id,
          name: meData.user.name,
          email: meData.user.email
        });
      }

      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        throw new Error("Failed to load group details.");
      }
      const data = await res.json();
      setGroup(data.group);
      setMembers(data.members);
      setExpenses(data.expenses);
      setSettlements(data.settlements);
      setBalances(data.balances);
      setSimplifiedTxs(data.simplifiedTransactions);
      setInvitations(data.invitations || []);

      // Pre-populate expense modal fields
      if (data.members.length > 0) {
        setExpPayer(data.members[0].userId);
        
        // Check everyone by default for splits
        const checkedMap: Record<string, { checked: boolean; value: string }> = {};
        data.members.forEach((m: Member) => {
          checkedMap[m.userId] = { checked: true, value: "" };
        });
        setExpParticipants(checkedMap);
      }

      // Fetch analytics in background
      fetchAnalytics();
    } catch (err: any) {
      setError(err.message || "An error occurred fetching group.");
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

  const fetchCategories = async () => {
    try {
      // Create a dummy expense query to seed categories or load standard ones
      // Since standard seeded categories exist, let's fetch them.
      // We can grab categories directly from a category query.
      // We can just construct a small list or fetch a standard API if implemented,
      // but to be extremely safe, we fetch category records from a seed helper or hardcode standard lists.
      // Wait, we seeded categories! Let's mock a categories query or get it.
      // In PayPaySplit, we have categories: Food, Hotel, Fuel, Shopping, Tickets, Entertainment, Miscellaneous.
      // Let's hardcode a beautiful local catalog which maps perfectly to the database category names!
      // In db.ts they are seeded as: Food, Hotel, Fuel, Shopping, Tickets, Entertainment, Miscellaneous.
      // Let's query them or let's create a quick API. Wait, to fetch categories cleanly:
      // Let's just retrieve them dynamically from the group's expenses or a general endpoint,
      // or we can fetch `/api/categories`. Wait! Did we write a `/api/categories` API? No.
      // But wait! We can easily load them inside the group Details from the backend,
      // or query them using a Prisma query inside `GET /api/groups/[id]`!
      // Wait, let's look at `GET /api/groups/[id]`. It doesn't return categories, but we can query them or
      // let's fetch them dynamically from a custom inline endpoint or hardcode their IDs once we query one expense,
      // or we can just fetch all categories in the database via the API or let's just make a call.
      // Let's see: we can hardcode the names and since database maps categories by name,
      // let's get the list of category names and resolve their IDs by fetching a quick custom endpoint or
      // returning them in group detail!
      // Let's inspect `GET /api/groups/[id]` route - wait, it is already written!
      // We can easily fetch categories. Let's see how we can fetch them.
      // Wait, we can implement an API `GET /api/categories` or write a quick categories fetch inside our component.
      // Wait, let's see. Let's write an API route for categories if needed, or simply let the backend resolve categoryId based on category name!
      // Yes! That's incredibly elegant: in `POST /api/expenses`, if we pass the category name instead of ID, or if we pass the category ID.
      // Wait, we can fetch all categories! Let's write a small API `GET /api/categories` or we can let `/api/groups/[id]` return the categories!
      // Let's write a quick API route `/api/categories` so we can load them elegantly in any modal.
      // Let's create `/Users/pratyush/Projects/Settleup/src/app/api/categories/route.ts`!
    } catch (e) {
      console.error("Categories fetch failed", e);
    }
  };

  // We will dynamically fetch the list of categories. Let's fetch them.
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) {
          setCategories(d.categories);
          if (d.categories.length > 0) setExpCategory(d.categories[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error("Analytics load failed", e);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess(false);
    setInviteLoading(true);

    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      setInviteLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member.");
      }

      setInviteSuccess(true);
      setInviteEmail("");
      
      // Refresh the group details to show the new member
      await fetchGroupDetails();
    } catch (err: any) {
      setInviteError(err.message || "An error occurred.");
    } finally {
      setInviteLoading(false);
    }
  };

  const triggerDuplicateExpense = (e: any) => {
    setExpTitle(`${e.title} (Copy)`);
    setExpDesc(e.description || "");
    setExpAmount(parseFloat(e.totalAmount).toString());
    setExpPayer(e.paidById);
    setExpCategory(e.category?.id || "");
    setExpSplitType(e.splitType);
    setExpDate(new Date(e.expenseDate).toISOString().split("T")[0]);

    // Build participants status map
    const newParticipantsMap: Record<string, { checked: boolean; value: string }> = {};

    // First initialize all group members to unchecked/empty
    members.forEach((m) => {
      newParticipantsMap[m.userId] = { checked: false, value: "" };
    });

    // Check those that were in the original expense
    e.participants.forEach((p: any) => {
      let val = "";
      if (e.splitType === "PERCENTAGE") {
        val = p.percentage !== undefined ? p.percentage.toString() : "";
      } else if (e.splitType === "SHARES") {
        val = p.shares !== undefined ? p.shares.toString() : "";
      } else if (e.splitType === "EXACT") {
        val = p.shareAmount !== undefined ? parseFloat(p.shareAmount).toString() : "";
      }
      newParticipantsMap[p.userId] = {
        checked: true,
        value: val,
      };
    });

    setExpParticipants(newParticipantsMap);
    setExpError("");
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete expense.");
      }

      setDeleteConfirmId(null);
      // Refresh group details
      await fetchGroupDetails();
    } catch (err: any) {
      setDeleteConfirmId(null);
      setError(err.message || "An error occurred deleting the expense.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member.");
      }

      // Refresh group details
      await fetchGroupDetails();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    }
  };

  const handleCreateCustomCategory = async (e: React.MouseEvent) => {
    e.preventDefault();
    setCustomCategoryError("");
    setCustomCategoryLoading(true);

    if (!newCategoryName.trim()) {
      setCustomCategoryError("Category name cannot be empty.");
      setCustomCategoryLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category.");
      }

      const newCat = data.category;
      setCategories((prev) => {
        if (prev.some((c) => c.id === newCat.id)) return prev;
        return [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name));
      });

      setExpCategory(newCat.id);
      setIsCreatingCustomCategory(false);
      setNewCategoryName("");
    } catch (err: any) {
      setCustomCategoryError(err.message || "An error occurred.");
    } finally {
      setCustomCategoryLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError("");
    setExpLoading(true);

    const amountNum = parseFloat(expAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpError("Please enter a valid positive expense amount.");
      setExpLoading(false);
      return;
    }

    // Build participants array
    const checkedParticipants = Object.entries(expParticipants)
      .filter(([_, data]) => data.checked)
      .map(([userId, data]) => {
        const item: any = { userId };
        if (expSplitType === "PERCENTAGE") {
          item.percentage = parseFloat(data.value) || 0;
        } else if (expSplitType === "SHARES") {
          item.shares = parseInt(data.value, 10) || 0;
        } else if (expSplitType === "EXACT") {
          item.shareAmount = parseFloat(data.value) || 0;
        }
        return item;
      });

    if (checkedParticipants.length === 0) {
      setExpError("Please select at least one participant for the split.");
      setExpLoading(false);
      return;
    }

    // Client-side validations
    if (expSplitType === "PERCENTAGE") {
      const sum = checkedParticipants.reduce((s, p) => s + p.percentage, 0);
      if (Math.abs(sum - 100) > 0.01) {
        setExpError(`The sum of percentages must equal 100%. Current sum: ${sum}%`);
        setExpLoading(false);
        return;
      }
    } else if (expSplitType === "EXACT") {
      const sum = checkedParticipants.reduce((s, p) => s + p.shareAmount, 0);
      if (Math.abs(sum - amountNum) > 0.01) {
        setExpError(`The sum of exact split shares (₹${sum.toFixed(2)}) must equal the total amount (₹${amountNum.toFixed(2)}).`);
        setExpLoading(false);
        return;
      }
    } else if (expSplitType === "SHARES") {
      const totalShares = checkedParticipants.reduce((s, p) => s + p.shares, 0);
      if (totalShares <= 0) {
        setExpError("The total shares must be greater than 0.");
        setExpLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          title: expTitle.trim(),
          description: expDesc.trim(),
          totalAmount: amountNum,
          paidById: expPayer,
          categoryId: expCategory,
          splitType: expSplitType,
          expenseDate: new Date(expDate).toISOString(),
          participants: checkedParticipants,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to log expense.");
      }

      setIsExpenseModalOpen(false);
      setExpTitle("");
      setExpDesc("");
      setExpAmount("");
      
      // Refresh details
      await fetchGroupDetails();
    } catch (err: any) {
      setExpError(err.message || "An error occurred.");
    } finally {
      setExpLoading(false);
    }
  };

  const handleAddSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettleError("");
    setSettleLoading(true);

    const amountNum = parseFloat(settleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSettleError("Please enter a valid positive amount.");
      setSettleLoading(false);
      return;
    }

    if (settlePayer === settleReceiver) {
      setSettleError("Payer and receiver must be different members.");
      setSettleLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          paidById: settlePayer,
          paidToId: settleReceiver,
          amount: amountNum,
          settlementDate: new Date(settleDate).toISOString(),
          note: settleNote.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to log settlement.");
      }

      setIsSettleModalOpen(false);
      setSettleAmount("");
      setSettleNote("");
      
      // Refresh details
      await fetchGroupDetails();
    } catch (err: any) {
      setSettleError(err.message || "An error occurred.");
    } finally {
      setSettleLoading(false);
    }
  };

  // Pre-fill settlement and open modal when clicking "Settle Up" on a debt recommendation
  const triggerQuickSettle = (fromId: string, toId: string, amount: number) => {
    setSettlePayer(fromId);
    setSettleReceiver(toId);
    setSettleAmount(amount.toString());
    setIsSettleModalOpen(true);
  };

  // Open Settle Modal with defaults
  const openDefaultSettleModal = () => {
    if (members.length >= 2) {
      setSettlePayer(members[0].userId);
      setSettleReceiver(members[1].userId);
    }
    setSettleAmount("");
    setIsSettleModalOpen(true);
  };

  // Dynamic splits helper
  const handleParticipantChange = (userId: string, checked: boolean, val?: string) => {
    setExpParticipants((prev) => ({
      ...prev,
      [userId]: {
        checked,
        value: val !== undefined ? val : prev[userId]?.value || "",
      },
    }));
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header bar */}
      <header className="w-full border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight truncate max-w-[200px] sm:max-w-sm">
                {group?.name || "Loading Group..."}
              </h1>
              <p className="text-xs text-zinc-500 truncate max-w-[200px] sm:max-w-sm">
                {group?.description || "PayPaySplit expense circle"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {currentUser && (
              <Link
                href="/profile"
                className="text-right hidden md:block group mr-1"
                title="Edit profile"
              >
                <div className="text-[11px] font-semibold text-white group-hover:text-purple-400 transition flex items-center gap-1 justify-end">
                  <UserCircle className="h-3 w-3 text-zinc-500 group-hover:text-purple-400 transition" />
                  {currentUser.name}
                </div>
                <div className="text-[9px] text-zinc-500 group-hover:text-zinc-400 transition">{currentUser.email}</div>
              </Link>
            )}
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold text-xs sm:text-sm text-white shadow shadow-purple-500/25 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Expense</span>
            </button>
            <button
              onClick={openDefaultSettleModal}
              className="flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 font-semibold text-xs sm:text-sm transition cursor-pointer"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Settle Up</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-20">
            <div className="h-10 w-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-zinc-400">Loading PayPaySplit details...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Split Page Layout: Left pane vs Right pane */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT COLUMN: Expenses, Settlements, Analytics */}
              <div className="lg:col-span-2 space-y-6">
                {/* View Tabs */}
                <div className="flex border-b border-white/5 pb-px gap-6 text-sm font-semibold">
                  <button
                    onClick={() => setViewTab("expenses")}
                    className={`pb-3 border-b-2 cursor-pointer transition ${
                      viewTab === "expenses"
                        ? "border-purple-500 text-purple-400"
                        : "border-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    Expenses & Payments
                  </button>
                  <button
                    onClick={() => setViewTab("analytics")}
                    className={`pb-3 border-b-2 cursor-pointer transition ${
                      viewTab === "analytics"
                        ? "border-purple-500 text-purple-400"
                        : "border-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    Spending Analytics
                  </button>
                </div>

                {viewTab === "expenses" ? (() => {
                  // Build filter derived state
                  const _uniqueCategories = Array.from(new Map(
                    expenses.filter((e) => e.category).map((e) => [e.category!.id, e.category!])
                  ).values());
                  const _filteredExpenses = expenses.filter((e) => {
                    const mOk = !filterMemberId || e.paidById === filterMemberId || (e.participants || []).some((p: any) => p.userId === filterMemberId);
                    const cOk = !filterCategoryId || e.category?.id === filterCategoryId;
                    return mOk && cOk;
                  });
                  const _isFiltered = !!(filterMemberId || filterCategoryId);

                  return (
                  <div className="space-y-4">
                    {/* Filter Bar */}
                    {expenses.length > 0 && (
                      <div className="glass-card rounded-2xl p-4 space-y-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Filter by Person</p>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setFilterMemberId(null)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${!filterMemberId ? "bg-purple-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                              Everyone
                            </button>
                            {members.map((m) => (
                              <button key={m.userId}
                                onClick={() => setFilterMemberId(filterMemberId === m.userId ? null : m.userId)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${filterMemberId === m.userId ? "bg-purple-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        {_uniqueCategories.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Filter by Category</p>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => setFilterCategoryId(null)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${!filterCategoryId ? "bg-blue-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                All Categories
                              </button>
                              {_uniqueCategories.map((cat: any) => {
                                const _M = CATEGORY_META[cat.icon] || CATEGORY_META.HelpCircle;
                                const _CI = _M.icon;
                                return (
                                  <button key={cat.id}
                                    onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${filterCategoryId === cat.id ? "bg-blue-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                    <_CI className="h-3 w-3" />{cat.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {_isFiltered && (
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <p className="text-[11px] text-zinc-500">
                              Showing <span className="text-white font-semibold">{_filteredExpenses.length}</span> of <span className="text-white font-semibold">{expenses.length}</span> expenses
                            </p>
                            <button onClick={() => { setFilterMemberId(null); setFilterCategoryId(null); }}
                              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer transition">
                              Clear filters
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feed */}
                    {_filteredExpenses.length === 0 && !_isFiltered && settlements.length === 0 ? (
                      <div className="glass-card rounded-2xl p-12 text-center flex flex-col justify-center items-center">
                        <div className="h-14 w-14 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
                          <CreditCard className="h-7 w-7" />
                        </div>
                        <h4 className="text-white font-semibold text-base mb-1">No Activity Logged</h4>
                        <p className="text-zinc-400 text-sm max-w-sm mb-6">
                          There are no expenses or settlement payments logged in this group. Click &quot;Add Expense&quot; to get started!
                        </p>
                      </div>
                    ) : _filteredExpenses.length === 0 && _isFiltered ? (
                      <div className="glass-card rounded-2xl p-10 text-center flex flex-col justify-center items-center">
                        <p className="text-zinc-400 text-sm">No expenses match the selected filters.</p>
                        <button onClick={() => { setFilterMemberId(null); setFilterCategoryId(null); }}
                          className="mt-3 text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer transition">
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Chronological list of events */}
                        {[
                          ..._filteredExpenses.map((e) => ({ ...e, type: "EXPENSE" as const, dateKey: new Date(e.expenseDate).getTime() })),
                          ...(!_isFiltered ? settlements.map((s) => ({ ...s, type: "SETTLEMENT" as const, dateKey: new Date(s.settlementDate).getTime() })) : []),
                        ]
                          .sort((a, b) => b.dateKey - a.dateKey)
                          .map((event) => {
                            if (event.type === "EXPENSE") {
                              const e = event as any;
                              const Meta = CATEGORY_META[e.category?.icon] || CATEGORY_META.HelpCircle;
                              const IconComponent = Meta.icon;

                              return (
                                <div
                                  key={e.id}
                                  className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4 group relative overflow-hidden"
                                >
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Category Icon Badge */}
                                    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${Meta.color}`}>
                                      <IconComponent className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-bold text-white truncate">{e.title}</h4>
                                      <p className="text-zinc-500 text-xs mt-1 truncate">
                                        Paid by <span className="text-zinc-300 font-semibold">{e.paidBy?.name}</span> •{" "}
                                        {new Date(e.expenseDate).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-base font-extrabold text-white">₹{parseFloat(e.totalAmount).toFixed(2)}</p>
                                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                                        {e.splitType} Split
                                      </span>
                                    </div>

                                    {/* Duplicate Button */}
                                    <button
                                      onClick={() => triggerDuplicateExpense(e)}
                                      className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-500 hover:text-purple-400 hover:border-purple-500/20 hover:bg-purple-500/5 transition cursor-pointer"
                                      title="Duplicate Expense"
                                    >
                                      <Copy className="h-3.8 w-3.8" />
                                    </button>

                                    {/* Delete Button — inline two-step confirmation */}
                                    {deleteConfirmId === e.id ? (
                                      <div className="flex items-center gap-1.5 animate-fade-in">
                                        <button
                                          onClick={() => handleDeleteExpense(e.id)}
                                          className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-bold transition cursor-pointer"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmId(null)}
                                          className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setDeleteConfirmId(e.id)}
                                        className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition cursor-pointer"
                                        title="Delete Expense"
                                      >
                                        <Trash2 className="h-3.8 w-3.8" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            } else {
                              const s = event as any;
                              return (
                                <div
                                  key={s.id}
                                  className="glass-card rounded-2xl p-4 bg-zinc-900/35 border-dashed flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                      <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-zinc-400 font-semibold">
                                        <span className="text-white font-bold">{s.paidBy?.name}</span> paid{" "}
                                        <span className="text-white font-bold">{s.paidTo?.name}</span>
                                      </p>
                                      {s.note && <p className="text-[10px] text-zinc-500 italic mt-0.5">"{s.note}"</p>}
                                    </div>
                                  </div>

                                  <p className="text-sm font-extrabold text-emerald-400">₹{parseFloat(s.amount).toFixed(2)}</p>
                                </div>
                              );
                            }
                          })}
                      </div>
                    )}
                  </div>
                  );
                })() : (
                  <div className="space-y-6">
                    {/* Visual Charts using HTML/CSS */}
                    {analytics && analytics.totalSpend > 0 ? (
                      <div className="space-y-6">
                        {/* Summary Header */}
                        <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                          <div>
                            <p className="text-zinc-500 text-xs uppercase tracking-wider">Total Group Spending</p>
                            <h3 className="text-3xl font-extrabold text-white mt-1">₹{analytics.totalSpend.toFixed(2)}</h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">
                            <PieChart className="h-4 w-4" />
                            <span>Rich Category Distribution</span>
                          </div>
                        </div>

                        {/* Category Progress Breakdown */}
                        <div className="glass-card rounded-2xl p-6 space-y-4">
                          <h4 className="text-sm font-semibold text-white">Category Spending Distribution</h4>
                          
                          {/* Cumulative Progress Bar */}
                          <div className="h-3 w-full rounded-full bg-zinc-900 overflow-hidden flex">
                            {analytics.categoryBreakdown.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  width: `${c.percentage}%`,
                                  backgroundColor: c.color,
                                }}
                                title={`${c.name}: ${c.percentage}%`}
                                className="h-full first:rounded-l-full last:rounded-r-full"
                              />
                            ))}
                          </div>

                          {/* Legends Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                            {analytics.categoryBreakdown.map((c, i) => {
                              const Meta = CATEGORY_META[c.icon] || CATEGORY_META.HelpCircle;
                              const Icon = Meta.icon;
                              return (
                                <div key={i} className="flex items-center gap-2.5">
                                  <div
                                    className="h-3.5 w-3.5 rounded-full"
                                    style={{ backgroundColor: c.color }}
                                  />
                                  <div>
                                    <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                                    <p className="text-[10px] text-zinc-500">
                                      ₹{c.totalSpend.toFixed(2)} ({c.percentage}%)
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* User Contribution Chart */}
                        <div className="glass-card rounded-2xl p-6 space-y-5">
                          <h4 className="text-sm font-semibold text-white">Member Contributions (Paid vs Owed)</h4>
                          
                          <div className="space-y-4">
                            {analytics.contributionsBreakdown.map((member, i) => {
                              const maxAmount = Math.max(
                                ...analytics.contributionsBreakdown.map((m) => Math.max(m.paid, m.owed))
                              ) || 1;

                              const paidPercent = (member.paid / maxAmount) * 100;
                              const owedPercent = (member.owed / maxAmount) * 100;

                              return (
                                <div key={i} className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-white">{member.name}</span>
                                    <span className="text-zinc-500 text-[10px]">
                                      Paid: <span className="text-emerald-400">₹{member.paid.toFixed(0)}</span> | Owed:{" "}
                                      <span className="text-rose-400">₹{member.owed.toFixed(0)}</span>
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    {/* Paid progress */}
                                    <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden">
                                      <div
                                        style={{ width: `${paidPercent}%` }}
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                      />
                                    </div>
                                    {/* Owed progress */}
                                    <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden">
                                      <div
                                        style={{ width: `${owedPercent}%` }}
                                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card rounded-2xl p-12 text-center flex flex-col justify-center items-center">
                        <BarChart className="h-12 w-12 text-zinc-500 mb-4" />
                        <h4 className="text-white font-semibold text-base mb-1">Insufficient Data</h4>
                        <p className="text-zinc-400 text-sm max-w-sm">
                          Please add some expenses to compile rich spending charts and contributions visualizations.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Balances, Settlements Suggestions, Add Member */}
              <div className="space-y-6">
                {/* Invite Member Section */}
                <div className="glass-card rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <UserPlus className="h-4.5 w-4.5 text-purple-400" />
                    Invite Member
                  </h3>

                  {inviteError && (
                    <div className="mb-3 p-2 rounded bg-red-500/15 border border-red-500/30 text-[10px] text-red-400">
                      {inviteError}
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="mb-3 p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400">
                      Member added successfully!
                    </div>
                  )}

                  <form onSubmit={handleInvite} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="friend@example.com"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteSuccess(false);
                      }}
                      disabled={inviteLoading}
                      className="flex-1 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 transition"
                    />
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-xs transition cursor-pointer"
                    >
                      {inviteLoading ? "..." : "Add"}
                    </button>
                  </form>
                </div>

                {/* Pending Invitations */}
                {invitations.length > 0 && (
                  <div className="glass-card rounded-2xl p-5 shadow-xl">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                      <Mail className="h-4.5 w-4.5 text-purple-400" />
                      Pending Invitations
                    </h3>
                    <div className="space-y-2">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                          <span className="text-zinc-300 truncate pr-2" title={inv.email}>
                            {inv.email}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                            Invited
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simplified Settlement recommendations */}
                <div className="glass-card rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <ArrowRightLeft className="h-4.5 w-4.5 text-purple-400" />
                    Simplified Settlements
                  </h3>

                  {simplifiedTxs.length === 0 ? (
                    <p className="text-zinc-500 text-xs text-center py-6">
                      Awesome! Everyone is fully settled. No payments are needed.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {simplifiedTxs.map((tx, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="text-xs">
                            <p className="text-zinc-400">
                              <span className="text-white font-bold">{tx.fromName}</span> owes
                            </p>
                            <p className="text-white font-bold mt-0.5">
                              ₹{tx.amount.toFixed(2)} to {tx.toName}
                            </p>
                          </div>

                          <button
                            onClick={() => triggerQuickSettle(tx.fromId, tx.toId, tx.amount)}
                            className="py-1 px-2.5 bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 hover:text-white rounded-lg font-bold text-[10px] text-purple-400 transition cursor-pointer"
                          >
                            Record pay
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Balances */}
                <div className="glass-card rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Users className="h-4.5 w-4.5 text-purple-400" />
                    Member Balances
                  </h3>

                  <div className="space-y-4">
                    {balances.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0 group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-white font-semibold truncate">{member.userName}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{member.email}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right flex-shrink-0">
                            {member.netBalance > 0.005 ? (
                              <p className="text-emerald-400 font-bold">Owes them ₹{member.netBalance.toFixed(2)}</p>
                            ) : member.netBalance < -0.005 ? (
                              <p className="text-rose-400 font-bold">Owes others ₹{Math.abs(member.netBalance).toFixed(2)}</p>
                            ) : (
                              <p className="text-zinc-500">Settled up</p>
                            )}
                            <p className="text-[9px] text-zinc-600">Paid: ₹{member.totalPaid.toFixed(0)}</p>
                          </div>

                          {/* Delete membership button (only for members other than the creator, but we can do safe delete since the balance is verified!) */}
                          {currentUser && currentUser.userId !== member.userId && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/20 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              title="Remove Member"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto relative animate-zoom-in">
            <button
              onClick={() => setIsExpenseModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Add a shared expense</h3>

            {expError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                {expError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expTitle" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Description / Title
                  </label>
                  <input
                    id="expTitle"
                    type="text"
                    required
                    placeholder="e.g. Flight Tickets, Dinner"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>

                <div>
                  <label htmlFor="expAmount" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Amount (INR)
                  </label>
                  <input
                    id="expAmount"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expPayer" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Paid By
                  </label>
                  <select
                    id="expPayer"
                    value={expPayer}
                    onChange={(e) => setExpPayer(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:bg-zinc-950"
                  >
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId} className="bg-zinc-950">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="expCategory" className="block text-xs font-semibold text-zinc-400">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCustomCategory((v) => !v);
                        setCustomCategoryError("");
                        setNewCategoryName("");
                      }}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer transition"
                    >
                      {isCreatingCustomCategory ? "Cancel" : "+ Add Custom"}
                    </button>
                  </div>

                  {isCreatingCustomCategory ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => {
                            setNewCategoryName(e.target.value);
                            setCustomCategoryError("");
                          }}
                          placeholder="Category name (e.g. Flights)"
                          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 outline-none"
                        />
                        <button
                          type="button"
                          disabled={customCategoryLoading}
                          onClick={handleCreateCustomCategory}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg text-xs font-semibold text-white transition cursor-pointer"
                        >
                          {customCategoryLoading ? "..." : "Add"}
                        </button>
                      </div>
                      {customCategoryError && (
                        <p className="text-[10px] text-red-400">{customCategoryError}</p>
                      )}
                    </div>
                  ) : (
                    <select
                      id="expCategory"
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:bg-zinc-950"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-zinc-950">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expSplitType" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Split Method
                  </label>
                  <select
                    id="expSplitType"
                    value={expSplitType}
                    onChange={(e) => {
                      setExpSplitType(e.target.value);
                      // Clear value inputs
                      const updated = { ...expParticipants };
                      Object.keys(updated).forEach((k) => {
                        updated[k] = { checked: true, value: "" };
                      });
                      setExpParticipants(updated);
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:bg-zinc-950"
                  >
                    <option value="EQUAL" className="bg-zinc-950">Equally</option>
                    <option value="EXACT" className="bg-zinc-950">Exact Amounts</option>
                    <option value="PERCENTAGE" className="bg-zinc-950">Percentages</option>
                    <option value="SHARES" className="bg-zinc-950">By Shares</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="expDate" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Expense Date
                  </label>
                  <input
                    id="expDate"
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-4">
                <p className="text-xs font-semibold text-zinc-400 mb-2">Split Participants Details</p>
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {members.map((m) => {
                    const status = expParticipants[m.userId] || { checked: false, value: "" };
                    return (
                      <div key={m.userId} className="flex items-center justify-between gap-4 text-xs">
                        <label className="flex items-center gap-2 font-semibold text-white select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={status.checked}
                            onChange={(e) => handleParticipantChange(m.userId, e.target.checked)}
                            className="rounded accent-purple-600 h-4 w-4 bg-zinc-900 border-zinc-800"
                          />
                          <span>{m.name}</span>
                        </label>

                        {status.checked && expSplitType !== "EQUAL" && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder={
                                expSplitType === "PERCENTAGE"
                                  ? "%"
                                  : expSplitType === "SHARES"
                                  ? "Shares"
                                  : "INR"
                              }
                              value={status.value}
                              onChange={(e) => handleParticipantChange(m.userId, true, e.target.value)}
                              className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-center text-xs text-white"
                            />
                            <span className="text-zinc-500 font-semibold">
                              {expSplitType === "PERCENTAGE"
                                ? "%"
                                : expSplitType === "SHARES"
                                ? "shares"
                                : "INR"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={expLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-sm font-semibold text-white rounded-lg shadow transition cursor-pointer mt-2"
              >
                {expLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Log Expense"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SETTLE UP MODAL */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 relative animate-zoom-in">
            <button
              onClick={() => setIsSettleModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Record a settlement payment</h3>

            {settleError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                {settleError}
              </div>
            )}

            <form onSubmit={handleAddSettlement} className="space-y-4">
              <div>
                <label htmlFor="settlePayer" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Who Paid? (Payer)
                </label>
                <select
                  id="settlePayer"
                  value={settlePayer}
                  onChange={(e) => setSettlePayer(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:bg-zinc-950"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId} className="bg-zinc-950">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="settleReceiver" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Who Received? (Receiver)
                </label>
                <select
                  id="settleReceiver"
                  value={settleReceiver}
                  onChange={(e) => setSettleReceiver(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:bg-zinc-950"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId} className="bg-zinc-950">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settleAmount" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Amount Paid (INR)
                  </label>
                  <input
                    id="settleAmount"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>

                <div>
                  <label htmlFor="settleDate" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Date Paid
                  </label>
                  <input
                    id="settleDate"
                    type="date"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="settleNote" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Note / Memo
                </label>
                <input
                  id="settleNote"
                  type="text"
                  placeholder="e.g. Settle Goa Cash, UPI payment"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white"
                />
              </div>

              <button
                type="submit"
                disabled={settleLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-sm font-semibold text-white rounded-lg shadow transition cursor-pointer mt-2"
              >
                {settleLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Record Payment"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
