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
  Check,
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
  UserCircle,
  Coins,
  Plane,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  Share2,
  MessageCircle
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
  Coins: { icon: Coins, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  Cash: { icon: Coins, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cash: { icon: Coins, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  UserCircle: { icon: UserCircle, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  Personal: { icon: UserCircle, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  personal: { icon: UserCircle, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  Plane: { icon: Plane, color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  Travel: { icon: Plane, color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  travel: { icon: Plane, color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
};

const resolveCategoryMeta = (cat: { icon?: string; name?: string } | null | undefined) => {
  if (!cat) return CATEGORY_META.HelpCircle;
  if (cat.icon && cat.icon !== "HelpCircle" && CATEGORY_META[cat.icon]) {
    return CATEGORY_META[cat.icon];
  }
  if (cat.name) {
    const nameKey = cat.name.trim();
    if (CATEGORY_META[nameKey]) return CATEGORY_META[nameKey];
    const lowerName = nameKey.toLowerCase();
    if (CATEGORY_META[lowerName]) return CATEGORY_META[lowerName];
    const capitalizedName = nameKey.charAt(0).toUpperCase() + nameKey.slice(1).toLowerCase();
    if (CATEGORY_META[capitalizedName]) return CATEGORY_META[capitalizedName];
    
    if (lowerName.includes("cash") || lowerName.includes("coin")) return CATEGORY_META.Coins;
    if (lowerName.includes("personal") || lowerName.includes("self")) return CATEGORY_META.UserCircle;
    if (lowerName.includes("travel") || lowerName.includes("plane") || lowerName.includes("flight") || lowerName.includes("trip")) return CATEGORY_META.Plane;
  }
  if (cat.icon && CATEGORY_META[cat.icon]) {
    return CATEGORY_META[cat.icon];
  }
  return CATEGORY_META.HelpCircle;
};

interface Member {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  upiId?: string | null;
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

interface ExpenseDraftPayload {
  groupId: string;
  title: string;
  description: string;
  totalAmount: number;
  paidById: string;
  categoryId: string;
  splitType: string;
  expenseDate: string;
  participants: Array<{
    userId: string;
    percentage?: number;
    shares?: number;
    shareAmount?: number;
  }>;
}

const inferCategoryIdFromTitle = (
  title: string,
  categoryList: Array<{ id: string; name: string }>
): string | null => {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle || categoryList.length === 0) return null;

  const tokens = normalizedTitle
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter(Boolean);

  let best: { id: string; score: number } | null = null;

  for (const category of categoryList) {
    const cat = category.name.toLowerCase();
    let score = 0;

    if (normalizedTitle.includes(cat) || cat.includes(normalizedTitle)) {
      score += 10;
    }

    for (const token of tokens) {
      if (token.length < 3) continue;
      if (cat.includes(token)) {
        score += 3;
      }
    }

    if (!best || score > best.score) {
      best = { id: category.id, score };
    }
  }

  return best && best.score > 0 ? best.id : null;
};

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
  const [viewTab, setViewTab] = useState<"expenses" | "analytics" | "balances">("expenses");
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [filterPaidById, setFilterPaidById] = useState<string | null>(null);
  const [filterSearchText, setFilterSearchText] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [viewingEventId, setViewingEventId] = useState<string | null>(null);
  const [viewingEventType, setViewingEventType] = useState<"EXPENSE" | "SETTLEMENT" | null>(null);

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
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

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
  const [queuedExpenses, setQueuedExpenses] = useState<ExpenseDraftPayload[]>([]);

  // Custom Category States
  const [isCreatingCustomCategory, setIsCreatingCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategoryLoading, setCustomCategoryLoading] = useState(false);
  const [customCategoryError, setCustomCategoryError] = useState("");

  // Edit Expense States
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Settle Up States
  const [settlePayer, setSettlePayer] = useState("");
  const [settleReceiver, setSettleReceiver] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split("T")[0]);
  const [settleNote, setSettleNote] = useState("");
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Inline delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit Group States
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupLoading, setEditGroupLoading] = useState(false);
  const [editGroupError, setEditGroupError] = useState("");

  const isAnyModalOpen = isExpenseModalOpen || isSettleModalOpen || isInviteModalOpen || isEditGroupModalOpen || !!viewingEventId;

  // Derived state lifted to top level for feed rendering and keyboard details navigation
  const _isFiltered = !!(filterMemberId || filterCategoryId || filterPaidById || filterSearchText.trim() || filterStartDate || filterEndDate);
  const _filteredExpenses = expenses.filter((e) => {
    const mOk = !filterMemberId || e.paidById === filterMemberId || (e.participants || []).some((p: any) => p.userId === filterMemberId);
    const cOk = !filterCategoryId || e.category?.id === filterCategoryId;
    const pOk = !filterPaidById || e.paidById === filterPaidById;
    
    // Fuzzy search match on Title or Description
    let sOk = true;
    if (filterSearchText.trim()) {
      const term = filterSearchText.toLowerCase().trim();
      const titleMatch = e.title.toLowerCase().includes(term);
      const descMatch = e.description ? e.description.toLowerCase().includes(term) : false;
      sOk = titleMatch || descMatch;
    }

    // Date range boundary match (inclusive of entire calendar days)
    let dOk = true;
    const expTime = new Date(e.expenseDate).getTime();
    if (filterStartDate) {
      const startTime = new Date(filterStartDate + "T00:00:00").getTime();
      if (expTime < startTime) dOk = false;
    }
    if (filterEndDate) {
      const endTime = new Date(filterEndDate + "T23:59:59").getTime();
      if (expTime > endTime) dOk = false;
    }

    return mOk && cOk && pOk && sOk && dOk;
  });

  const sortedEvents = [
    ..._filteredExpenses.map((e) => ({ ...e, type: "EXPENSE" as const, dateKey: new Date(e.expenseDate).getTime(), rawDate: e.expenseDate })),
    ...(!_isFiltered ? settlements.map((s) => ({ ...s, type: "SETTLEMENT" as const, dateKey: new Date(s.settlementDate).getTime(), rawDate: s.settlementDate })) : []),
  ].sort((a, b) => b.dateKey - a.dateKey);

  // Keyboard navigation for Details Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingEventId) return;

      const idx = sortedEvents.findIndex(event => event.id === viewingEventId && event.type === viewingEventType);
      if (idx === -1) return;

      if (e.key === "ArrowLeft" && idx > 0) {
        const prevEvent = sortedEvents[idx - 1];
        setViewingEventId(prevEvent.id);
        setViewingEventType(prevEvent.type);
      } else if (e.key === "ArrowRight" && idx < sortedEvents.length - 1) {
        const nextEvent = sortedEvents[idx + 1];
        setViewingEventId(nextEvent.id);
        setViewingEventType(nextEvent.type);
      } else if (e.key === "Escape") {
        setViewingEventId(null);
        setViewingEventType(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingEventId, viewingEventType, sortedEvents]);

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

  useEffect(() => {
    if (!isExpenseModalOpen || editingExpenseId) return;
    const matchedCategoryId = inferCategoryIdFromTitle(expTitle, categories);
    if (matchedCategoryId && matchedCategoryId !== expCategory) {
      setExpCategory(matchedCategoryId);
    }
  }, [isExpenseModalOpen, editingExpenseId, expTitle, categories, expCategory]);

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

  const copyToClipboard = (text: string, onSuccess: () => void) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          onSuccess();
        })
        .catch(() => {
          fallbackCopyText(text, onSuccess);
        });
    } else {
      fallbackCopyText(text, onSuccess);
    }
  };

  const fallbackCopyText = (text: string, onSuccess: () => void) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Prevent keyboard popping on mobile
    textArea.readOnly = true;
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    // Prevent pointer event capture issues on the element
    textArea.style.pointerEvents = "none";
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); // Mobile Safari support
    
    try {
      document.execCommand("copy");
      onSuccess();
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
    
    // Defer removal to prevent mobile browsers' pointer capture system from throwing exceptions
    setTimeout(() => {
      if (document.body.contains(textArea)) {
        document.body.removeChild(textArea);
      }
    }, 150);
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/signup?group=${groupId}`;
    copyToClipboard(link, () => {
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 2000);
    });
  };

  const getWhatsAppShareUrl = () => {
    const text = `Hey! Join our "${group?.name || 'Expenses'}" on PayPaySplit, Because *“we’ll split it later” has ruined civilizations*: ${window.location.origin}/signup?group=${groupId}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const getSmsShareUrl = () => {
    const text = `Hey! Join our "${group?.name || 'Expenses'}" on PayPaySplit, Because “we’ll split it later” has ruined civilizations: ${window.location.origin}/signup?group=${groupId}`;
    return `sms:?&body=${encodeURIComponent(text)}`;
  };

  const openAddExpenseModal = () => {
    setExpTitle("");
    setExpDesc("");
    setExpAmount("");
    if (members.length > 0) {
      setExpPayer(members[0].userId);
      const checkedMap: Record<string, { checked: boolean; value: string }> = {};
      members.forEach((m) => {
        checkedMap[m.userId] = { checked: true, value: "" };
      });
      setExpParticipants(checkedMap);
    }
    if (categories.length > 0) {
      setExpCategory(categories[0].id);
    }
    setExpSplitType("EQUAL");
    setExpDate(new Date().toISOString().split("T")[0]);
    setExpError("");
    setEditingExpenseId(null);
    setQueuedExpenses([]);
    setIsExpenseModalOpen(true);
  };

  const triggerEditExpense = (e: any) => {
    setExpTitle(e.title);
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
        val = p.percentage !== null && p.percentage !== undefined ? p.percentage.toString() : "";
      } else if (e.splitType === "SHARES") {
        val = p.shares !== null && p.shares !== undefined ? p.shares.toString() : "";
      } else if (e.splitType === "EXACT") {
        val = p.shareAmount !== null && p.shareAmount !== undefined ? parseFloat(p.shareAmount).toString() : "";
      }
      newParticipantsMap[p.userId] = {
        checked: true,
        value: val,
      };
    });

    setExpParticipants(newParticipantsMap);
    setExpError("");
    setEditingExpenseId(e.id);
    setQueuedExpenses([]);
    setIsExpenseModalOpen(true);
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
    setQueuedExpenses([]);
    setIsExpenseModalOpen(true);
  };

  const applyGroupSnapshot = (snapshot: any) => {
    if (!snapshot) return;
    setGroup(snapshot.group);
    setMembers(snapshot.members || []);
    setExpenses(snapshot.expenses || []);
    setSettlements(snapshot.settlements || []);
    setBalances(snapshot.balances || []);
    setSimplifiedTxs(snapshot.simplifiedTransactions || []);
  };

  const buildExpenseDraftFromForm = (): ExpenseDraftPayload | null => {
    const amountNum = parseFloat(expAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpError("Please enter a valid positive expense amount.");
      return null;
    }

    const checkedParticipants = expSplitType === "SELF"
      ? [{ userId: expPayer }]
      : Object.entries(expParticipants)
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
      return null;
    }

    if (expSplitType === "PERCENTAGE") {
      const sum = checkedParticipants.reduce((s, p) => s + p.percentage, 0);
      if (Math.abs(sum - 100) > 0.01) {
        setExpError(`The sum of percentages must equal 100%. Current sum: ${sum}%`);
        return null;
      }
    } else if (expSplitType === "EXACT") {
      const sum = checkedParticipants.reduce((s, p) => s + p.shareAmount, 0);
      if (Math.abs(sum - amountNum) > 0.01) {
        setExpError(`The sum of exact split shares (₹${sum.toFixed(2)}) must equal the total amount (₹${amountNum.toFixed(2)}).`);
        return null;
      }
    } else if (expSplitType === "SHARES") {
      const totalShares = checkedParticipants.reduce((s, p) => s + p.shares, 0);
      if (totalShares <= 0) {
        setExpError("The total shares must be greater than 0.");
        return null;
      }
    }

    return {
      groupId,
      title: expTitle.trim(),
      description: expDesc.trim(),
      totalAmount: amountNum,
      paidById: expPayer,
      categoryId: expCategory,
      splitType: expSplitType,
      expenseDate: new Date(expDate).toISOString(),
      participants: checkedParticipants,
    };
  };

  const resetExpenseFormForNextEntry = () => {
    setExpTitle("");
    setExpDesc("");
    setExpAmount("");
    setExpParticipants((prev) => {
      const updated: Record<string, { checked: boolean; value: string }> = {};
      Object.keys(prev).forEach((k) => {
        updated[k] = {
          checked: prev[k].checked,
          value: "",
        };
      });
      return updated;
    });
  };

  const flushQueuedExpenses = async (toCreate: ExpenseDraftPayload[]) => {
    if (toCreate.length === 0) {
      return;
    }

    const response = await fetch("/api/expenses/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenses: toCreate,
        includeGroupSnapshot: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to log queued expenses.");
    }

    if (data.groupSnapshot) {
      applyGroupSnapshot(data.groupSnapshot);
    } else {
      await fetchGroupDetails();
    }
  };

  const closeExpenseModal = async () => {
    if (expLoading) return;
    if (editingExpenseId || queuedExpenses.length === 0) {
      setIsExpenseModalOpen(false);
      setQueuedExpenses([]);
      return;
    }

    setExpLoading(true);
    setExpError("");
    try {
      await flushQueuedExpenses(queuedExpenses);
      setQueuedExpenses([]);
      setIsExpenseModalOpen(false);
      resetExpenseFormForNextEntry();
    } catch (err: any) {
      setExpError(err.message || "An error occurred.");
    } finally {
      setExpLoading(false);
    }
  };

  useEffect(() => {
    if (!isExpenseModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void closeExpenseModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isExpenseModalOpen, closeExpenseModal]);

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

    const draft = buildExpenseDraftFromForm();
    if (!draft) {
      setExpLoading(false);
      return;
    }

    try {
      if (editingExpenseId) {
        const response = await fetch(`/api/expenses/${editingExpenseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to update expense.");
        }

        setIsExpenseModalOpen(false);
        setExpTitle("");
        setExpDesc("");
        setExpAmount("");
        setEditingExpenseId(null);
        setQueuedExpenses([]);
        await fetchGroupDetails();
      } else {
        const toCreate = [...queuedExpenses, draft];
        await flushQueuedExpenses(toCreate);

        setIsExpenseModalOpen(false);
        setExpTitle("");
        setExpDesc("");
        setExpAmount("");
        setEditingExpenseId(null);
        setQueuedExpenses([]);
      }
    } catch (err: any) {
      setExpError(err.message || "An error occurred.");
    } finally {
      setExpLoading(false);
    }
  };

  const handleKeepLoggingExpense = async () => {
    if (editingExpenseId) return;
    setExpError("");

    const draft = buildExpenseDraftFromForm();
    if (!draft) return;

    setQueuedExpenses((prev) => [...prev, draft]);
    resetExpenseFormForNextEntry();
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

  const openEditGroupModal = () => {
    if (group) {
      setEditGroupName(group.name);
      setEditGroupDesc(group.description || "");
      setEditGroupError("");
      setIsEditGroupModalOpen(true);
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditGroupError("");
    setEditGroupLoading(true);

    if (!editGroupName.trim()) {
      setEditGroupError("Group name is required.");
      setEditGroupLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editGroupName.trim(),
          description: editGroupDesc.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update group.");
      }

      setIsEditGroupModalOpen(false);
      await fetchGroupDetails();
    } catch (err: any) {
      setEditGroupError(err.message || "An error occurred.");
    } finally {
      setEditGroupLoading(false);
    }
  };

  // Pre-fill settlement and open modal when clicking "Settle Up" on a debt recommendation
  const triggerQuickSettle = (fromId: string, toId: string, amount: number) => {
    setSettlePayer(fromId);
    setSettleReceiver(toId);
    setSettleAmount(amount.toString());
    setIsSettleModalOpen(true);
  };

  const handleCopyUpi = (upi: string) => {
    copyToClipboard(upi, () => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    });
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

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, and . (decimal point)
    // Also allow Ctrl+A, Ctrl+C, Ctrl+V, Cmd+A, Cmd+C, Cmd+V, arrow keys, etc.
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter", ".", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
      (e.key === "a" && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.key === "c" && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.key === "v" && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.key === "x" && (e.ctrlKey === true || e.metaKey === true))
    ) {
      // If they are entering a second decimal point, prevent it
      if (e.key === "." && e.currentTarget.value.includes(".")) {
        e.preventDefault();
      }
      return;
    }
    // Block anything else that is not a digit (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  const sidebarContent = (
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

      {/* Total Group Spend Card */}
      {analytics && (
        <div className="glass-card rounded-2xl p-5 shadow-xl relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Total Group Spend</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">₹{analytics.totalSpend.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl">
            <Coins className="h-5 w-5 text-purple-400" />
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
                    <p className="text-emerald-400 font-bold">Gets back ₹{member.netBalance.toFixed(2)}</p>
                  ) : member.netBalance < -0.005 ? (
                    <p className="text-rose-400 font-bold">Owes others ₹{Math.abs(member.netBalance).toFixed(2)}</p>
                  ) : (
                    <p className="text-zinc-500">Settled up</p>
                  )}
                  <p className="text-[9px] text-zinc-600">Paid: ₹{member.totalPaid.toFixed(0)}</p>
                </div>

                {/* Delete membership button */}
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
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header bar */}
      <header className="w-full border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Row 1: Back arrow, Group info, and Profile/Logout on mobile */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer flex-shrink-0"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate max-w-[140px] sm:max-w-sm">
                    {group?.name || "Loading Group..."}
                  </h1>
                  {group && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={openEditGroupModal}
                      className="p-1 rounded text-zinc-500 hover:text-purple-400 hover:bg-white/5 transition cursor-pointer"
                      title="Edit group details"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="p-1 rounded text-zinc-500 hover:text-purple-400 hover:bg-white/5 transition cursor-pointer"
                      title="Invite members"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-purple-400/90" />
                    </button>
                  </div>
                )}
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-500 truncate max-w-[160px] sm:max-w-sm">
                  {group?.description || "PayPaySplit expense circle"}
                </p>
              </div>
            </div>

            {/* Mobile-only secondary block for Profile & Logout */}
            <div className="flex items-center gap-2 sm:hidden">
              {currentUser && (
                <Link
                  href="/profile"
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition flex items-center justify-center"
                  title={`Edit profile (${currentUser.name})`}
                >
                  <UserCircle className="h-4.5 w-4.5" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
                title="Log Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Row 2 on mobile, right-aligned flex block on desktop */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Desktop-only Profile info */}
            {currentUser && (
              <Link
                href="/profile"
                className="text-right hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
                title="Edit profile"
              >
                <UserCircle className="h-4.5 w-4.5 text-zinc-400" />
                <div className="text-left hidden md:block">
                  <div className="text-[11px] font-semibold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[9px] text-zinc-500 leading-tight">{currentUser.email}</div>
                </div>
              </Link>
            )}

            {/* Main Action Buttons: Hidden on mobile (since FAB is present), inline auto on desktop */}
            <div className="hidden sm:flex sm:items-center sm:gap-3">
              <button
                onClick={openAddExpenseModal}
                className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold text-xs sm:text-sm text-white shadow shadow-purple-500/25 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Expense</span>
              </button>
            </div>

            {/* Desktop-only Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer hidden sm:block"
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
                <div className="flex border-b border-white/5 pb-px gap-4 sm:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none whitespace-nowrap">
                  <button
                    onClick={() => setViewTab("expenses")}
                    className={`pb-3 border-b-2 cursor-pointer transition flex-shrink-0 ${viewTab === "expenses"
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Expenses & Payments
                  </button>
                  
                  {/* Balances & Settles Tab - Visible only on Mobile */}
                  <button
                    onClick={() => setViewTab("balances")}
                    className={`pb-3 border-b-2 cursor-pointer transition flex-shrink-0 lg:hidden ${viewTab === "balances"
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Balances & Settles
                  </button>

                  <button
                    onClick={() => setViewTab("analytics")}
                    className={`pb-3 border-b-2 cursor-pointer transition flex-shrink-0 ${viewTab === "analytics"
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Spending Analytics
                  </button>
                </div>

                {viewTab === "balances" && (
                  <div className="lg:hidden space-y-6">
                    {sidebarContent}
                  </div>
                )}

                {viewTab === "expenses" && (() => {
                  // Build filter derived state
                  const _uniqueCategories = Array.from(new Map(
                    expenses.filter((e) => e.category).map((e) => [e.category!.id, e.category!])
                  ).values());

                  // Calculate live totals for the filters based on current applied filters
                  // 1. memberShareTotal: selected member's share filtered by Category & Payer
                  const memberShareTotal = filterMemberId
                    ? expenses
                        .filter((e) => {
                          const cOk = !filterCategoryId || e.category?.id === filterCategoryId;
                          const pOk = !filterPaidById || e.paidById === filterPaidById;
                          return cOk && pOk;
                        })
                        .reduce((sum, e) => {
                          const p = (e.participants || []).find((part: any) => part.userId === filterMemberId);
                          return sum + (p ? parseFloat(p.shareAmount) : 0);
                        }, 0)
                    : 0;

                  // 2. payerTotalPaid: selected payer's total paid, filtered by Category if selected (ignoring Member/Person filter)
                  const payerTotalPaid = filterPaidById
                    ? expenses
                        .filter((e) => e.paidById === filterPaidById && (!filterCategoryId || e.category?.id === filterCategoryId))
                        .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0)
                    : 0;

                  // 3. categoryTotalSpent: category total spent, filtered by Payer if selected (ignoring Member/Person filter)
                  const categoryTotalSpent = filterCategoryId
                    ? expenses
                        .filter((e) => e.category?.id === filterCategoryId && (!filterPaidById || e.paidById === filterPaidById))
                        .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0)
                    : 0;

                  const overallTotalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.totalAmount || "0"), 0);
                  const filteredTotalSpent = _filteredExpenses.reduce((sum, e) => sum + parseFloat(e.totalAmount || "0"), 0);

                  return (
                    <div className="space-y-4">
                      {/* Overall Stats Card */}
                      {expenses.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-fade-in">
                          <div className="glass-card rounded-2xl p-3 sm:p-4 flex flex-col justify-between border border-white/5 bg-zinc-950/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-10 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                              <Coins className="h-6 w-6 sm:h-8 sm:w-8" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-zinc-500 truncate">
                              {_isFiltered ? "Filtered Spend" : "Group Total Spend"}
                            </span>
                            <span className={`text-[15px] xs:text-base sm:text-xl font-extrabold mt-1 truncate ${_isFiltered ? "text-purple-400 font-extrabold" : "text-white font-extrabold"}`}>
                              ₹{filteredTotalSpent.toFixed(2)}
                            </span>
                          </div>

                          <div className="glass-card rounded-2xl p-3 sm:p-4 flex flex-col justify-between border border-white/5 bg-zinc-950/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-10 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-zinc-500 truncate">Activity Count</span>
                            <span className="text-[15px] xs:text-base sm:text-xl font-extrabold text-white mt-1 truncate">
                              {_isFiltered ? `${_filteredExpenses.length} of ${expenses.length}` : `${expenses.length}`} {expenses.length === 1 ? "Item" : "Items"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Filter Bar */}
                      {expenses.length > 0 && (
                        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
                          {/* Sleek Collapsible Header */}
                          <div 
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            className="flex items-center justify-between p-3.5 cursor-pointer select-none hover:bg-white/[0.02] active:bg-white/[0.04] transition-all"
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              <div className={`p-1.5 rounded-lg transition-colors ${isFilterExpanded || _isFiltered ? "bg-purple-500/10 text-purple-400" : "bg-zinc-800/50 text-zinc-400"}`}>
                                <SlidersHorizontal className="h-4 w-4" />
                              </div>
                              
                              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                <span className="text-xs font-semibold text-zinc-300">Filters</span>
                                
                                {/* Collapsed Active Badges */}
                                {!isFilterExpanded && _isFiltered && (
                                  <div className="flex flex-wrap items-center gap-1.5 ml-2">
                                    {filterMemberId && (() => {
                                      const name = members.find(m => m.userId === filterMemberId)?.name || "Member";
                                      return (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); setFilterMemberId(null); }}
                                          className="group/badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer"
                                        >
                                          <span>Part: {name}</span>
                                          <X className="h-2.5 w-2.5 text-purple-400/60 group-hover/badge:text-purple-400" />
                                        </span>
                                      );
                                    })()}
                                    
                                    {filterPaidById && (() => {
                                      const name = members.find(m => m.userId === filterPaidById)?.name || "Payer";
                                      return (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); setFilterPaidById(null); }}
                                          className="group/badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                                        >
                                          <span>Paid: {name}</span>
                                          <X className="h-2.5 w-2.5 text-emerald-400/60 group-hover/badge:text-emerald-400" />
                                        </span>
                                      );
                                    })()}

                                    {filterCategoryId && (() => {
                                      const cat = _uniqueCategories.find(c => c.id === filterCategoryId);
                                      const name = cat?.name || "Category";
                                      const _M = resolveCategoryMeta(cat);
                                      const _CI = _M.icon;
                                      return (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); setFilterCategoryId(null); }}
                                          className="group/badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition cursor-pointer"
                                        >
                                          <_CI className="h-2.5 w-2.5 text-blue-400" />
                                          <span>{name}</span>
                                          <X className="h-2.5 w-2.5 text-blue-400/60 group-hover/badge:text-blue-400" />
                                        </span>
                                      );
                                    })()}

                                    {filterSearchText.trim() && (
                                      <span 
                                        onClick={(e) => { e.stopPropagation(); setFilterSearchText(""); }}
                                        className="group/badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer"
                                      >
                                        <span>Search: "{filterSearchText}"</span>
                                        <X className="h-2.5 w-2.5 text-purple-400/60 group-hover/badge:text-purple-400" />
                                      </span>
                                    )}

                                    {(filterStartDate || filterEndDate) && (
                                      <span 
                                        onClick={(e) => { e.stopPropagation(); setFilterStartDate(""); setFilterEndDate(""); }}
                                        className="group/badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                                      >
                                        <Calendar className="h-2.5 w-2.5 text-emerald-400" />
                                        <span>
                                          {filterStartDate ? new Date(filterStartDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Start"} 
                                          - {filterEndDate ? new Date(filterEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "End"}
                                        </span>
                                        <X className="h-2.5 w-2.5 text-emerald-400/60 group-hover/badge:text-emerald-400" />
                                      </span>
                                    )}

                                    {/* Clear Button */}
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setFilterMemberId(null); 
                                        setFilterCategoryId(null); 
                                        setFilterPaidById(null); 
                                        setFilterSearchText("");
                                        setFilterStartDate("");
                                        setFilterEndDate("");
                                      }}
                                      className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold ml-1 cursor-pointer transition"
                                    >
                                      Clear All
                                    </button>
                                  </div>
                                )}
                                
                                {!isFilterExpanded && !_isFiltered && (
                                  <span className="text-[11px] text-zinc-500 font-medium">None active (showing all expenses)</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Summary of items showing in collapsed view if filtered */}
                              {!isFilterExpanded && (
                                <span className="text-[11px] text-zinc-500 font-medium">
                                  {_filteredExpenses.length} / {expenses.length}
                                </span>
                              )}
                              <div className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800/30 transition-colors">
                                {isFilterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isFilterExpanded && (
                            <div className="border-t border-white/5 p-4 space-y-4 bg-zinc-950/20">
                              {/* Row 0: Fuzzy Text Search & Date Range Picker */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-white/5">
                                {/* Search Input */}
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Search Title / Description</p>
                                  <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                    <input 
                                      type="text" 
                                      value={filterSearchText}
                                      onChange={(e) => setFilterSearchText(e.target.value)}
                                      placeholder="Type to search title or description..."
                                      className="w-full pl-9 pr-8 py-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-900/80 transition"
                                    />
                                    {filterSearchText && (
                                      <button 
                                        onClick={() => setFilterSearchText("")}
                                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Date Range Picker */}
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Filter by Date Range</p>
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                      <input 
                                        type="date" 
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-900/80 transition [color-scheme:dark]"
                                      />
                                    </div>
                                    <span className="text-zinc-500 text-xs font-semibold select-none">to</span>
                                    <div className="relative flex-1">
                                      <input 
                                        type="date" 
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-900/80 transition [color-scheme:dark]"
                                      />
                                    </div>
                                    {(filterStartDate || filterEndDate) && (
                                      <button 
                                        onClick={() => { setFilterStartDate(""); setFilterEndDate(""); }}
                                        className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition cursor-pointer"
                                        title="Clear date range"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Row 1: Filter by Person (Part of Expense) */}
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Filter by Person (Part of Expense)</p>
                                  {filterMemberId && (
                                    <span className="text-[10px] font-extrabold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                      Share: ₹{memberShareTotal.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => setFilterMemberId(null)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${!filterMemberId ? "bg-purple-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                    Everyone
                                  </button>
                                  {members.map((m) => {
                                    const isSelected = filterMemberId === m.userId;
                                    // Calculate dynamic share for this member under other filters (Category + Payer)
                                    const mShare = expenses
                                      .filter((e) => {
                                        const cOk = !filterCategoryId || e.category?.id === filterCategoryId;
                                        const pOk = !filterPaidById || e.paidById === filterPaidById;
                                        return cOk && pOk;
                                      })
                                      .reduce((sum, e) => {
                                        const p = (e.participants || []).find((part: any) => part.userId === m.userId);
                                        return sum + (p ? parseFloat(p.shareAmount) : 0);
                                      }, 0);

                                    return (
                                      <button key={m.userId}
                                        onClick={() => setFilterMemberId(isSelected ? null : m.userId)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${isSelected ? "bg-purple-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                        <span>{m.name}</span>
                                        {isSelected && (
                                          <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px] font-extrabold">
                                            ₹{mShare.toFixed(2)}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Row 2: Filter by Paid By (Specific Payer Only) */}
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Filter by Paid By (Payer Only)</p>
                                  {filterPaidById && (
                                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      Paid: ₹{payerTotalPaid.toFixed(2)}
                                      {filterMemberId && ` • ${members.find(m => m.userId === filterMemberId)?.name || 'Member'}'s Share: ₹${memberShareTotal.toFixed(2)}`}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => setFilterPaidById(null)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${!filterPaidById ? "bg-emerald-600/90 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                    Any Payer
                                  </button>
                                  {members.map((m) => {
                                    const isSelected = filterPaidById === m.userId;
                                    // Calculate total paid by this member as Payer, considering the category filter if selected (ignoring Member/Person filter)
                                    const mPaid = expenses
                                      .filter((e) => e.paidById === m.userId && (!filterCategoryId || e.category?.id === filterCategoryId))
                                      .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

                                    return (
                                      <button key={m.userId}
                                        onClick={() => setFilterPaidById(isSelected ? null : m.userId)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${isSelected ? "bg-emerald-600/90 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                        <span>{m.name}</span>
                                        {isSelected && (
                                          <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px] font-extrabold">
                                            ₹{mPaid.toFixed(2)}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Row 3: Filter by Category */}
                              {_uniqueCategories.length > 0 && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Filter by Category</p>
                                    {filterCategoryId && (
                                      <span className="text-[10px] font-extrabold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                        Spent: ₹{categoryTotalSpent.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setFilterCategoryId(null)}
                                      className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${!filterCategoryId ? "bg-blue-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                      All Categories
                                    </button>
                                    {_uniqueCategories.map((cat: any) => {
                                      const _M = resolveCategoryMeta(cat);
                                      const _CI = _M.icon;
                                      const isSelected = filterCategoryId === cat.id;
                                      // Calculate total spent in this category under other filters (Payer - ignoring Member/Person filter)
                                      const catSpent = expenses
                                        .filter((e) => e.category?.id === cat.id && (!filterPaidById || e.paidById === filterPaidById))
                                        .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

                                      return (
                                        <button key={cat.id}
                                          onClick={() => setFilterCategoryId(isSelected ? null : cat.id)}
                                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${isSelected ? "bg-blue-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"}`}>
                                          <_CI className="h-3 w-3" />
                                          <span>{cat.name}</span>
                                          {isSelected && (
                                            <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px] font-extrabold">
                                              ₹{catSpent.toFixed(2)}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {_isFiltered && (() => {
                                const filterPersonName = members.find(m => m.userId === filterMemberId)?.name || "Everyone";
                                const filterCategoryName = _uniqueCategories.find(c => c.id === filterCategoryId)?.name || "All Categories";
                                const filterPaidByName = members.find(m => m.userId === filterPaidById)?.name || "Any Payer";

                                let totalPaid = 0;
                                let totalShare = 0;

                                if (filterMemberId) {
                                  totalPaid = _filteredExpenses
                                    .filter(e => e.paidById === filterMemberId)
                                    .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

                                  totalShare = _filteredExpenses.reduce((sum, e) => {
                                    const p = (e.participants || []).find((part: any) => part.userId === filterMemberId);
                                    return sum + (p ? parseFloat(p.shareAmount) : 0);
                                  }, 0);
                                } else {
                                  totalPaid = _filteredExpenses.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
                                }

                                return (
                                  <div className="mt-2 pt-3 border-t border-white/5 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[11px] text-zinc-500">
                                        Showing <span className="text-white font-semibold">{_filteredExpenses.length}</span> of <span className="text-white font-semibold">{expenses.length}</span> expenses
                                      </p>
                                      <button onClick={() => { setFilterMemberId(null); setFilterCategoryId(null); setFilterPaidById(null); setFilterSearchText(""); setFilterStartDate(""); setFilterEndDate(""); }}
                                        className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer transition">
                                        Clear filters
                                      </button>
                                    </div>

                                    <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-3 space-y-2">
                                      <div className="text-[11px] text-zinc-400 font-semibold">
                                        Spend Summary: <span className="text-purple-400 font-bold">{filterPersonName}</span> in <span className="text-blue-400 font-bold">{filterCategoryName}</span>{filterPaidById && <> paid by <span className="text-emerald-400 font-bold">{filterPaidByName}</span></>}
                                      </div>
                                      <div className="grid grid-cols-2 gap-3 pt-1">
                                        {filterMemberId ? (
                                          <>
                                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-2">
                                              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Total Paid</p>
                                              <p className="text-xs font-extrabold text-emerald-400 mt-0.5">₹{totalPaid.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-2">
                                              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Actual Cost / Share</p>
                                              <p className="text-xs font-extrabold text-white mt-0.5">₹{totalShare.toFixed(2)}</p>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-2 flex justify-between items-center">
                                            <div>
                                              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-semibold">Total Category Spending</p>
                                              <p className="text-xs font-extrabold text-white mt-0.5">₹{totalPaid.toFixed(2)}</p>
                                            </div>
                                            <span className="text-[9px] text-zinc-500 font-medium">Across all members</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feed */}
                      {_filteredExpenses.length === 0 && !_isFiltered && settlements.length === 0 ? (
                        <div className="glass-card rounded-2xl p-10 sm:p-12 text-center flex flex-col justify-center items-center relative overflow-hidden">
                          {/* Top Highlight Icon */}
                          <div className="h-14 w-14 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
                            <CreditCard className="h-7 w-7" />
                          </div>
                          
                          <h4 className="text-white font-semibold text-base mb-1">No Activity Logged</h4>
                          <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
                            There are no expenses or settlement payments logged in this group yet. Click &quot;Add Expense&quot; to log your first transaction!
                          </p>

                          {/* Quick Invite & Join Card (for new groups to onboard friends instantly!) */}
                          <div className="w-full max-w-md p-5 rounded-2xl bg-zinc-950/40 border border-white/5 space-y-4 text-left shadow-inner">
                            <div>
                              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                <UserPlus className="h-3.5 w-3.5 text-purple-400" />
                                Onboard Group Members
                              </h5>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Share access to let others join this circle</p>
                            </div>

                            <div className="flex items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 p-2.5 rounded-xl">
                              <p className="text-[11px] text-zinc-300 font-bold truncate flex-1 select-all select-none pr-1">
                                {typeof window !== "undefined" ? `${window.location.origin}/signup?group=${groupId}` : ""}
                              </p>
                              <button
                                type="button"
                                onClick={handleCopyInviteLink}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                                  copiedInviteLink
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {copiedInviteLink ? "Copied!" : "Copy"}
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                              <button
                                type="button"
                                onClick={() => setIsInviteModalOpen(true)}
                                className="flex items-center justify-center gap-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition cursor-pointer"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                <span>Email</span>
                              </button>
                              <a
                                href={getWhatsAppShareUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 py-1.5 px-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400 text-zinc-400 rounded-lg font-bold transition cursor-pointer"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={getSmsShareUrl()}
                                className="flex items-center justify-center gap-1 py-1.5 px-2 bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:bg-purple-500/5 hover:text-purple-400 text-zinc-400 rounded-lg font-bold transition cursor-pointer"
                              >
                                <Share2 className="h-3.5 w-3.5 text-purple-400" />
                                <span>SMS</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : _filteredExpenses.length === 0 && _isFiltered ? (
                        <div className="glass-card rounded-2xl p-10 text-center flex flex-col justify-center items-center">
                          <p className="text-zinc-400 text-sm">No expenses match the selected filters.</p>
                          <button onClick={() => { setFilterMemberId(null); setFilterCategoryId(null); setFilterPaidById(null); setFilterSearchText(""); setFilterStartDate(""); setFilterEndDate(""); }}
                            className="mt-3 text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer transition">
                            Clear filters
                          </button>
                        </div>
                      ) : (
                        (() => {
                          // Group events by date string (YYYY-MM-DD)
                          const groups: { [dateStr: string]: typeof sortedEvents } = {};
                          sortedEvents.forEach((event) => {
                            const dateObj = new Date(event.rawDate);
                            const year = dateObj.getFullYear();
                            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                            const day = String(dateObj.getDate()).padStart(2, "0");
                            const key = `${year}-${month}-${day}`;
                            if (!groups[key]) {
                              groups[key] = [];
                            }
                            groups[key].push(event);
                          });

                          // Sort keys in descending order
                          const sortedDateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

                          const formatDateHeader = (dateStr: string) => {
                            const [yearStr, monthStr, dayStr] = dateStr.split("-");
                            const d = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));

                            const today = new Date();
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);

                            const isToday = d.getDate() === today.getDate() &&
                              d.getMonth() === today.getMonth() &&
                              d.getFullYear() === today.getFullYear();

                            const isYesterday = d.getDate() === yesterday.getDate() &&
                              d.getMonth() === yesterday.getMonth() &&
                              d.getFullYear() === yesterday.getFullYear();

                            const formattedDate = d.toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            });

                            if (isToday) {
                              return `Today — ${formattedDate}`;
                            }
                            if (isYesterday) {
                              return `Yesterday — ${formattedDate}`;
                            }

                            const weekday = d.toLocaleDateString("en-IN", { weekday: "long" });
                            return `${formattedDate} • ${weekday}`;
                          };

                          return (
                            <>
                              <div className="space-y-6">
                              {sortedDateKeys.map((dateKey) => {
                                const dayEvents = groups[dateKey];
                                const dayExpenses = dayEvents.filter((event) => event.type === "EXPENSE");
                                const dayTotal = dayExpenses.reduce((sum, event) => sum + parseFloat(event.totalAmount || "0"), 0);

                                return (
                                  <div key={dateKey} className="space-y-3">
                                    {/* Date Header / Divider */}
                                    <div className="flex items-center justify-between gap-4 px-1 py-1">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-full">
                                        <Calendar className="h-3 w-3 text-purple-400 animate-pulse" />
                                        <span>{formatDateHeader(dateKey)}</span>
                                        {dayTotal > 0 && (
                                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 text-[10px] font-extrabold border border-purple-500/20">
                                            ₹{dayTotal.toFixed(2)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex-1 h-px bg-white/5" />
                                      <span className="text-[10px] text-zinc-500 font-semibold">{dayEvents.length} {dayEvents.length === 1 ? "activity" : "activities"}</span>
                                    </div>

                                    {/* Events for this day */}
                                    <div className="space-y-3 pl-2.5 border-l border-purple-500/10 ml-3">
                                      {dayEvents.map((event) => {
                                        if (event.type === "EXPENSE") {
                                          const e = event as any;
                                          const Meta = resolveCategoryMeta(e.category);
                                          const IconComponent = Meta.icon;

                                          return (
                                            <div
                                              key={e.id}
                                              onClick={(event) => {
                                                const target = event.target as HTMLElement;
                                                if (target.closest('.no-row-click') || target.closest('button')) {
                                                  return;
                                                }
                                                setViewingEventId(e.id);
                                                setViewingEventType("EXPENSE");
                                              }}
                                              className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group relative transition-all duration-300 hover:border-zinc-700/50 hover:bg-zinc-900/10 cursor-pointer"
                                            >
                                              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                {/* Category Icon Badge */}
                                                <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${Meta.color}`}>
                                                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <h4 className="text-sm font-bold text-white truncate">{e.title}</h4>
                                                  <p className="text-zinc-500 text-[11px] sm:text-xs mt-0.5 truncate">
                                                    Paid by <span className="text-zinc-300 font-semibold">{e.paidBy?.name}</span>
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-white/5 pt-3 sm:border-0 sm:pt-0 no-row-click flex-shrink-0">
                                                <div className="text-left sm:text-right relative group/amount cursor-help flex-shrink-0">
                                                  <p className="text-sm sm:text-base font-extrabold text-white">₹{parseFloat(e.totalAmount).toFixed(2)}</p>
                                                  <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                    {e.splitType === "SELF" ? "Self Only" : `${e.splitType} Split`}
                                                  </span>

                                                  {/* Glassmorphic Hover Share Distribution Tooltip */}
                                                  <div className="bg-zinc-950/95 border border-zinc-800 backdrop-blur-md opacity-0 invisible scale-95 origin-bottom-right group-hover/amount:opacity-100 group-hover/amount:visible group-hover/amount:scale-100 transition-all duration-200 pointer-events-none shadow-2xl absolute right-0 bottom-full mb-2.5 z-30 w-64 p-3.5 rounded-xl text-left">
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2 gap-2">
                                                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                        Share Distribution
                                                      </p>
                                                      {e.category && (
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${Meta.color}`}>
                                                          <IconComponent className="h-2.5 w-2.5" />
                                                          <span>{e.category.name}</span>
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5">
                                                      {(() => {
                                                        let displayParticipants = e.participants || [];
                                                        if (displayParticipants.length === 0 || e.splitType === "SELF") {
                                                          displayParticipants = [{
                                                            userId: e.paidById,
                                                            shareAmount: e.totalAmount,
                                                            user: { name: e.paidBy?.name || "Payer" }
                                                          }];
                                                        }

                                                        return displayParticipants.map((p: any) => {
                                                          let extraLabel = "";
                                                          if (e.splitType === "PERCENTAGE" && p.percentage !== null && p.percentage !== undefined) {
                                                            extraLabel = ` (${p.percentage}%)`;
                                                          } else if (e.splitType === "SHARES" && p.shares !== null && p.shares !== undefined) {
                                                            extraLabel = ` (${p.shares} ${p.shares === 1 ? 'share' : 'shares'})`;
                                                          }

                                                          return (
                                                            <div key={p.userId} className="flex items-center justify-between py-1 gap-2 border-b border-white/[0.02] last:border-0">
                                                              <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-xs text-zinc-300 font-semibold truncate">
                                                                  {p.user?.name || "Member"}
                                                                </span>
                                                                {p.userId === e.paidById && (
                                                                  <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 py-0.5 rounded-md font-bold flex-shrink-0">
                                                                    Payer
                                                                  </span>
                                                                )}
                                                              </div>
                                                              <span className="text-xs text-white font-extrabold flex-shrink-0">
                                                                ₹{parseFloat(p.shareAmount).toFixed(2)}{extraLabel}
                                                              </span>
                                                            </div>
                                                          );
                                                        });
                                                      })()}
                                                    </div>
                                                    <div className="absolute right-4 top-full w-2 h-2 -translate-y-1 rotate-45 border-r border-b border-zinc-800 bg-zinc-950/95" />
                                                  </div>
                                                </div>

                                                {/* Action Buttons Group */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                  {/* Edit Button */}
                                                  <button
                                                    onClick={() => triggerEditExpense(e)}
                                                    className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-500 hover:text-blue-400 hover:border-blue-500/20 hover:bg-blue-500/5 transition cursor-pointer"
                                                    title="Edit Expense"
                                                  >
                                                    <Edit2 className="h-3.8 w-3.8" />
                                                  </button>

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
                                            </div>
                                          );
                                        } else {
                                          const s = event as any;
                                          return (
                                            <div
                                              key={s.id}
                                              onClick={(event) => {
                                                const target = event.target as HTMLElement;
                                                if (target.closest('.no-row-click') || target.closest('button')) {
                                                  return;
                                                }
                                                setViewingEventId(s.id);
                                                setViewingEventType("SETTLEMENT");
                                              }}
                                              className="glass-card rounded-2xl p-4 bg-zinc-900/30 border-dashed border-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 hover:border-zinc-700/30 hover:bg-zinc-900/15 cursor-pointer"
                                            >
                                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                                  <CheckCircle className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <p className="text-xs text-zinc-400 font-semibold truncate">
                                                    <span className="text-white font-bold">{s.paidBy?.name}</span> paid{" "}
                                                    <span className="text-white font-bold">{s.paidTo?.name}</span>
                                                  </p>
                                                  {s.note && <p className="text-[10px] text-zinc-500 italic mt-0.5 truncate">"{s.note}"</p>}
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between sm:justify-end border-t border-white/5 pt-2.5 sm:border-0 sm:pt-0 no-row-click flex-shrink-0">
                                                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider sm:hidden">Transfer Amount</span>
                                                <p className="text-sm font-extrabold text-emerald-400">₹{parseFloat(s.amount).toFixed(2)}</p>
                                              </div>
                                            </div>
                                          );
                                        }
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* DETAILED RECORD MODAL */}
                            {(() => {
                              const viewingEventIndex = viewingEventId 
                                ? sortedEvents.findIndex(event => event.id === viewingEventId && event.type === viewingEventType) 
                                : -1;
                              const viewingEvent = viewingEventIndex !== -1 ? sortedEvents[viewingEventIndex] : null;

                              const goToNextEvent = () => {
                                if (viewingEventIndex < sortedEvents.length - 1) {
                                  const nextEvent = sortedEvents[viewingEventIndex + 1];
                                  setViewingEventId(nextEvent.id);
                                  setViewingEventType(nextEvent.type);
                                }
                              };

                              const goToPrevEvent = () => {
                                if (viewingEventIndex > 0) {
                                  const prevEvent = sortedEvents[viewingEventIndex - 1];
                                  setViewingEventId(prevEvent.id);
                                  setViewingEventType(prevEvent.type);
                                }
                              };

                              if (!viewingEvent) return null;

                              return (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                  {/* Backdrop */}
                                  <div 
                                    onClick={() => { setViewingEventId(null); setViewingEventType(null); }}
                                    className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" 
                                  />
                                  
                                  {/* Modal Body */}
                                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 animate-scale-up flex flex-col max-h-[90vh]">
                                    
                                    {/* Modal Header */}
                                    <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {viewingEvent.type === "EXPENSE" ? (
                                          (() => {
                                            const e = viewingEvent as any;
                                            const Meta = resolveCategoryMeta(e.category);
                                            const IconComponent = Meta.icon;
                                            return (
                                              <>
                                                <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${Meta.color}`}>
                                                  <IconComponent className="h-5 w-5" />
                                                </div>
                                                <div>
                                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Expense Details</span>
                                                  <h3 className="text-base font-bold text-white leading-tight">{e.title}</h3>
                                                </div>
                                              </>
                                            );
                                          })()
                                        ) : (
                                          <>
                                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                              <CheckCircle className="h-5 w-5" />
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Settlement Payment</span>
                                              <h3 className="text-base font-bold text-white leading-tight">Member Transfer</h3>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      
                                      <button 
                                        onClick={() => { setViewingEventId(null); setViewingEventType(null); }}
                                        className="p-2 rounded-xl bg-zinc-800/40 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700/80 transition cursor-pointer"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>

                                    {/* Modal Content */}
                                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                                      {viewingEvent.type === "EXPENSE" ? (
                                        (() => {
                                          const e = viewingEvent as any;
                                          const Meta = resolveCategoryMeta(e.category);
                                          const IconComponent = Meta.icon;
                                          let displayParticipants = e.participants || [];
                                          if (displayParticipants.length === 0 || e.splitType === "SELF") {
                                            displayParticipants = [{
                                              userId: e.paidById,
                                              shareAmount: e.totalAmount,
                                              user: { name: e.paidBy?.name || "Payer" }
                                            }];
                                          }

                                          return (
                                            <>
                                              {/* Amount banner */}
                                              <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5 text-center relative overflow-hidden">
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Cost</p>
                                                <p className="text-3xl font-extrabold text-white mt-1">₹{parseFloat(e.totalAmount).toFixed(2)}</p>
                                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full mt-2 inline-block">
                                                  {e.splitType === "SELF" ? "Self Only" : `${e.splitType} Split`}
                                                </span>
                                              </div>

                                              {/* Transaction Metadata */}
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-zinc-950/20 border border-white/5 rounded-xl p-3.5">
                                                  <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Paid By</p>
                                                  <p className="text-sm font-extrabold text-white mt-1">{e.paidBy?.name}</p>
                                                </div>
                                                <div className="bg-zinc-950/20 border border-white/5 rounded-xl p-3.5">
                                                  <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Category</p>
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <IconComponent className={`h-4 w-4 ${Meta.color.split(" ")[1]}`} />
                                                    <p className="text-sm font-extrabold text-white">{e.category?.name || "Uncategorized"}</p>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Description */}
                                              {e.description && (
                                                <div className="bg-zinc-950/20 border border-white/5 rounded-xl p-4">
                                                  <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Description</p>
                                                  <p className="text-xs text-zinc-300 leading-relaxed font-medium italic">"{e.description}"</p>
                                                </div>
                                              )}

                                              {/* Share distribution list */}
                                              <div className="space-y-2.5">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5 pb-2">
                                                  Share Breakdown ({displayParticipants.length} {displayParticipants.length === 1 ? 'Person' : 'People'})
                                                </p>
                                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                                  {displayParticipants.map((p: any) => {
                                                    let extraLabel = "";
                                                    if (e.splitType === "PERCENTAGE" && p.percentage !== null && p.percentage !== undefined) {
                                                      extraLabel = ` (${p.percentage}%)`;
                                                    } else if (e.splitType === "SHARES" && p.shares !== null && p.shares !== undefined) {
                                                      extraLabel = ` (${p.shares} ${p.shares === 1 ? 'share' : 'shares'})`;
                                                    }

                                                    return (
                                                      <div key={p.userId} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/20 border border-white/[0.02]">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                          <span className="text-xs text-zinc-300 font-bold truncate">
                                                            {p.user?.name || "Member"}
                                                          </span>
                                                          {p.userId === e.paidById && (
                                                            <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 py-0.2 rounded font-bold">
                                                              Payer
                                                            </span>
                                                          )}
                                                        </div>
                                                        <span className="text-xs text-white font-extrabold flex-shrink-0">
                                                          ₹{parseFloat(p.shareAmount).toFixed(2)}{extraLabel}
                                                        </span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </>
                                          );
                                        })()
                                      ) : (
                                        (() => {
                                          const s = viewingEvent as any;
                                          return (
                                            <>
                                              {/* Amount banner */}
                                              <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5 text-center relative overflow-hidden">
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Settlement Transfer</p>
                                                <p className="text-3xl font-extrabold text-emerald-400 mt-1">₹{parseFloat(s.amount).toFixed(2)}</p>
                                              </div>

                                              {/* Transfer Metadata */}
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-zinc-950/20 border border-white/5 rounded-xl p-3.5">
                                                  <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">From (Sender)</p>
                                                  <p className="text-sm font-extrabold text-white mt-1">{s.paidBy?.name}</p>
                                                </div>
                                                <div className="bg-zinc-950/20 border border-white/5 rounded-xl p-3.5">
                                                  <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">To (Recipient)</p>
                                                  <p className="text-sm font-extrabold text-white mt-1">{s.paidTo?.name}</p>
                                                </div>
                                              </div>

                                              {/* Note */}
                                              {s.note && (
                                                <div className="bg-zinc-950/20 border border-white/5 rounded-xl p-4">
                                                  <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Transfer Note</p>
                                                  <p className="text-xs text-zinc-300 leading-relaxed font-medium italic">"{s.note}"</p>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()
                                      )}
                                    </div>

                                    {/* Modal Footer (Edit/Duplicate Actions + Next/Prev Navigation) */}
                                    <div className="p-4 bg-zinc-950/40 border-t border-white/5 flex items-center justify-between gap-4">
                                      {/* Next & Previous Controls */}
                                      <div className="flex items-center gap-1.5 no-row-click">
                                        <button
                                          disabled={viewingEventIndex === 0}
                                          onClick={goToPrevEvent}
                                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 disabled:cursor-not-allowed cursor-pointer transition"
                                          title="Previous Record (Left Arrow)"
                                        >
                                          <ArrowLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                          {viewingEventIndex + 1} / {sortedEvents.length}
                                        </span>
                                        <button
                                          disabled={viewingEventIndex === sortedEvents.length - 1}
                                          onClick={goToNextEvent}
                                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 disabled:cursor-not-allowed cursor-pointer transition"
                                          title="Next Record (Right Arrow)"
                                        >
                                          <ArrowRight className="h-4 w-4" />
                                        </button>
                                      </div>

                                      {/* Record Modification Controls */}
                                      {viewingEvent.type === "EXPENSE" ? (
                                        <div className="flex items-center gap-2 no-row-click">
                                          <button
                                            onClick={() => {
                                              const e = viewingEvent;
                                              setViewingEventId(null);
                                              setViewingEventType(null);
                                              triggerEditExpense(e);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                            <span>Edit</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              const e = viewingEvent;
                                              setViewingEventId(null);
                                              setViewingEventType(null);
                                              triggerDuplicateExpense(e);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
                                          >
                                            <Copy className="h-3 w-3" />
                                            <span>Duplicate</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                          Transfer Record
                                        </span>
                                      )}
                                    </div>
                                    
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        );
                        })()
                      )}
                    </div>
                  );
                })()}

                {viewTab === "analytics" && (
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

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                            {analytics.categoryBreakdown.map((c, i) => {
                              const Meta = resolveCategoryMeta(c);
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
              <div className="hidden lg:block space-y-6">
                {sidebarContent}
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
              onClick={closeExpenseModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {editingExpenseId ? "Edit shared expense" : "Add a shared expense"}
            </h3>

            {expError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                {expError}
              </div>
            )}

            {!editingExpenseId && queuedExpenses.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300">
                {queuedExpenses.length} expense{queuedExpenses.length > 1 ? "s" : ""} queued. Closing this dialog will log queued expenses automatically.
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
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(cleanNumberString(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
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
                    <option value="SELF" className="bg-zinc-950">Self Only (100% Payer)</option>
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

              {expSplitType !== "SELF" && (
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <p className="text-xs font-semibold text-zinc-400 mb-2">Split Participants Details</p>
                  
                  {expSplitType === "EQUAL" ? (
                    <div className="grid grid-cols-2 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {members.map((m) => {
                        const status = expParticipants[m.userId] || { checked: false, value: "" };
                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => handleParticipantChange(m.userId, !status.checked)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition select-none cursor-pointer ${
                              status.checked
                                ? "bg-purple-600/10 border-purple-500/35 text-white"
                                : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70"
                            }`}
                          >
                            <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition ${
                              status.checked
                                ? "bg-purple-600 border-purple-500 text-white"
                                : "border-zinc-700 bg-zinc-950"
                            }`}>
                              {status.checked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate leading-none">{m.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {members.map((m) => {
                        const status = expParticipants[m.userId] || { checked: false, value: "" };
                        return (
                          <div
                            key={m.userId}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition ${
                              status.checked
                                ? "bg-zinc-900/80 border-purple-500/15"
                                : "bg-zinc-900/20 border-zinc-800/40 opacity-70"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleParticipantChange(m.userId, !status.checked)}
                              className="flex items-center gap-2.5 text-left min-w-0 flex-1 select-none cursor-pointer"
                            >
                              <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition ${
                                status.checked
                                  ? "bg-purple-600 border-purple-500 text-white"
                                  : "border-zinc-700 bg-zinc-950"
                              }`}>
                                {status.checked && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-bold text-white truncate">{m.name}</span>
                            </button>

                            {status.checked && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  required
                                  placeholder={
                                    expSplitType === "PERCENTAGE"
                                      ? "%"
                                      : expSplitType === "SHARES"
                                        ? "Shares"
                                        : "INR"
                                  }
                                  value={status.value}
                                  onChange={(e) => handleParticipantChange(m.userId, true, cleanNumberString(e.target.value))}
                                  onKeyDown={handleNumericKeyDown}
                                  className="w-18 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-xs font-semibold text-white focus:border-purple-500/50 outline-none"
                                />
                                <span className="text-[10px] text-zinc-500 font-bold uppercase min-w-[32px]">
                                  {expSplitType === "PERCENTAGE"
                                    ? "%"
                                    : expSplitType === "SHARES"
                                      ? "shs"
                                      : "INR"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {editingExpenseId ? (
                <button
                  type="submit"
                  disabled={expLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-sm font-semibold text-white rounded-lg shadow transition cursor-pointer mt-2"
                >
                  {expLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={expLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-sm font-semibold text-white rounded-lg shadow transition cursor-pointer"
                  >
                    {expLoading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Log Expense"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleKeepLoggingExpense}
                    disabled={expLoading}
                    className="w-full py-2.5 px-4 bg-zinc-900 border border-zinc-700 hover:border-purple-500/40 hover:text-purple-300 disabled:opacity-50 text-sm font-semibold text-zinc-200 rounded-lg transition cursor-pointer"
                  >
                    Keep Logging Expense
                  </button>
                </div>
              )}
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

              {(() => {
                const receiverMember = members.find((m) => m.userId === settleReceiver);
                const upi = receiverMember?.upiId;
                return (
                  <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-semibold">Receiver's Payment Info</span>
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-md font-bold">UPI Quick Pay</span>
                    </div>

                    {upi ? (
                      <div className="flex items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800/80 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <Coins className="h-4 w-4 text-purple-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">UPI ID</p>
                            <p className="text-xs text-white font-bold truncate selection:bg-purple-500/30">{upi}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyUpi(upi)}
                          className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                            copiedUpi
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                          }`}
                        >
                          {copiedUpi ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-zinc-800/40 bg-zinc-900/20 text-center">
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          {receiverMember?.name || "This user"} has not registered a UPI ID yet. You can still record this settlement manually.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settleAmount" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Amount Paid (INR)
                  </label>
                  <input
                    id="settleAmount"
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(cleanNumberString(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
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

              {settleAmount && parseFloat(settleAmount) > 0 && (
                <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1 animate-fade-in">
                  <p className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Amount in Words</p>
                  <p className="text-xs text-white font-semibold italic selection:bg-purple-500/30">
                    {toRupeesInWords(settleAmount)}
                  </p>
                </div>
              )}

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
      {/* MODAL 3: EDIT GROUP DETAILS MODAL */}
      {isEditGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 relative animate-zoom-in">
            <button
              onClick={() => setIsEditGroupModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Edit group details</h3>

            {editGroupError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                {editGroupError}
              </div>
            )}

            <form onSubmit={handleEditGroup} className="space-y-4">
              <div>
                <label htmlFor="editGroupName" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Group Name
                </label>
                <input
                  id="editGroupName"
                  type="text"
                  required
                  placeholder="e.g. Flatmates, Goa Trip"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="editGroupDesc" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Description
                </label>
                <textarea
                  id="editGroupDesc"
                  placeholder="e.g. Shared expenses for our apartment"
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={editGroupLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-sm font-semibold text-white rounded-lg shadow transition cursor-pointer mt-2"
              >
                {editGroupLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DEDICATED INVITE MEMBERS MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 relative animate-zoom-in">
            <button
              onClick={() => {
                setIsInviteModalOpen(false);
                setInviteSuccess(false);
                setInviteError("");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Invite members</h3>
                <p className="text-xs text-zinc-500">Add people to &quot;{group?.name}&quot;</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Option 1: Email Invite */}
              <div className="space-y-2 border-b border-white/5 pb-4.5">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Invite via Email Address
                </label>
                
                {inviteError && (
                  <div className="mb-2.5 p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-[10px] text-red-400 animate-fade-in">
                    {inviteError}
                  </div>
                )}

                {inviteSuccess && (
                  <div className="mb-2.5 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 animate-fade-in">
                    Invitation sent successfully!
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
                      setInviteError("");
                    }}
                    disabled={inviteLoading}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 transition focus:border-purple-500/50 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition cursor-pointer flex items-center justify-center min-w-[70px]"
                  >
                    {inviteLoading ? (
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Invite"
                    )}
                  </button>
                </form>
              </div>

              {/* Option 2: Copy Join Link & Direct Share */}
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 mb-1.5">Share Invite / Join Link</h4>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Anyone with this link can create an account and join this circle.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800/80 p-2.5 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Join URL</p>
                    <p className="text-xs text-white font-bold truncate pr-2 selection:bg-purple-500/30">
                      {typeof window !== "undefined" ? `${window.location.origin}/signup?group=${groupId}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      copiedInviteLink
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    {copiedInviteLink ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Direct Share Shortcuts (WhatsApp / SMS) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={getWhatsAppShareUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400 text-zinc-400 text-xs font-semibold rounded-xl transition text-center cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={getSmsShareUrl()}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:bg-purple-500/5 hover:text-purple-400 text-zinc-400 text-xs font-semibold rounded-xl transition text-center cursor-pointer"
                  >
                    <Share2 className="h-4 w-4 text-purple-400" />
                    <span>SMS Share</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to Top / Scroll to Bottom Floating Buttons */}
      {viewTab === "expenses" && !isAnyModalOpen && (
        <div className="fixed bottom-6 left-6 sm:left-auto sm:right-6 z-50 flex flex-col gap-2">
          <button
            onClick={scrollToTop}
            className="p-2 sm:p-3 rounded-full bg-zinc-950/50 sm:bg-zinc-950/80 border border-white/5 sm:border-zinc-800 backdrop-blur-md text-zinc-500 sm:text-zinc-400 hover:text-white active:bg-zinc-900 shadow-xl sm:shadow-2xl transition cursor-pointer flex items-center justify-center hover:scale-105"
            title="Scroll to Top"
          >
            <ChevronUp className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={scrollToBottom}
            className="p-2 sm:p-3 rounded-full bg-zinc-950/50 sm:bg-zinc-950/80 border border-white/5 sm:border-zinc-800 backdrop-blur-md text-zinc-500 sm:text-zinc-400 hover:text-white active:bg-zinc-900 shadow-xl sm:shadow-2xl transition cursor-pointer flex items-center justify-center hover:scale-105"
            title="Scroll to Bottom"
          >
            <ChevronDown className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </button>
        </div>
      )}

      {/* Mobile-only "+ Add Expense" Floating Action Button */}
      {!isAnyModalOpen && (
        <button
          onClick={openAddExpenseModal}
          className="sm:hidden fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 border border-purple-400/20 text-white shadow-[0_8px_30px_rgba(168,85,247,0.4)] transition cursor-pointer flex items-center justify-center active:scale-95 duration-200 hover:scale-110"
          title="Add Expense"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

function cleanNumberString(val: string): string {
  // Allow digits and at most one decimal point
  let clean = val.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  return clean;
}

function toRupeesInWords(amountStr: string): string {
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return "";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred > 0) {
      res += ones[hundred] + " Hundred";
      if (rest > 0) res += " and ";
    }
    if (rest > 0) {
      if (rest < 20) {
        res += ones[rest];
      } else {
        res += tens[Math.floor(rest / 10)];
        if (rest % 10 > 0) res += "-" + ones[rest % 10];
      }
    }
    return res;
  };

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let words = "";

  if (integerPart === 0) {
    words = "Zero Rupees";
  } else {
    let n = integerPart;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;

    let parts = [];
    if (crore > 0) parts.push(convertLessThanThousand(crore) + " Crore");
    if (lakh > 0) parts.push(convertLessThanThousand(lakh) + " Lakh");
    if (thousand > 0) parts.push(convertLessThanThousand(thousand) + " Thousand");
    if (n > 0) parts.push(convertLessThanThousand(n));

    words = parts.join(", ") + " " + (integerPart === 1 ? "Rupee" : "Rupees");
  }

  if (decimalPart > 0) {
    words += " and " + convertLessThanThousand(decimalPart) + " " + (decimalPart === 1 ? "Paisa" : "Paise");
  }

  return words + " Only";
}
