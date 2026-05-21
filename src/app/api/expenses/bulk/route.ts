import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBalances, simplifyDebts } from "@/lib/debtSimplifier";

type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

type ParticipantInput = {
    userId: string;
    percentage?: number;
    shares?: number;
    shareAmount?: number;
};

type ExpenseInput = {
    groupId: string;
    title: string;
    description?: string;
    totalAmount: number;
    paidById: string;
    categoryId: string;
    splitType: SplitType;
    expenseDate: string;
    currency?: string;
    receiptUrl?: string;
    participants: ParticipantInput[];
};

type PreparedExpense = {
    id: string;
    groupId: string;
    title: string;
    description: string;
    totalAmount: number;
    paidById: string;
    categoryId: string;
    splitType: SplitType;
    expenseDate: Date;
    currency: string;
    receiptUrl: string;
    participants: {
        userId: string;
        shareAmount: number;
        percentage?: number;
        shares?: number;
    }[];
};

function normalizeParticipants(splitType: SplitType, participants: ParticipantInput[], parsedTotal: number) {
    let participantData: {
        userId: string;
        shareAmount: number;
        percentage?: number;
        shares?: number;
    }[] = [];

    if (splitType === "EQUAL") {
        const count = participants.length;
        const baseShare = Math.floor((parsedTotal * 100) / count) / 100;
        let remainder = Number((parsedTotal - baseShare * count).toFixed(2));

        participantData = participants.map((p) => {
            const extra = remainder > 0.005 ? 0.01 : 0;
            if (extra > 0) remainder = Number((remainder - 0.01).toFixed(2));

            return {
                userId: p.userId,
                shareAmount: Number((baseShare + extra).toFixed(2)),
            };
        });
    } else if (splitType === "EXACT") {
        let sum = 0;
        participantData = participants.map((p) => {
            const amt = Number(Number(p.shareAmount || 0).toFixed(2));
            sum += amt;
            return {
                userId: p.userId,
                shareAmount: amt,
            };
        });

        if (Math.abs(sum - parsedTotal) > 0.01) {
            throw new Error(
                `The sum of exact split amounts (${sum.toFixed(2)}) must equal the total expense amount (${parsedTotal.toFixed(2)}).`
            );
        }
    } else if (splitType === "PERCENTAGE") {
        let percentSum = 0;
        participants.forEach((p) => {
            percentSum += Number(p.percentage || 0);
        });

        if (Math.abs(percentSum - 100) > 0.01) {
            throw new Error(`The sum of percentages (${percentSum}%) must equal 100%.`);
        }

        let shareSum = 0;
        participantData = participants.map((p) => {
            const percent = Number(p.percentage || 0);
            const amt = Number(((percent / 100) * parsedTotal).toFixed(2));
            shareSum += amt;
            return {
                userId: p.userId,
                shareAmount: amt,
                percentage: percent,
            };
        });

        const diff = Number((parsedTotal - shareSum).toFixed(2));
        if (Math.abs(diff) > 0.005 && participantData.length > 0) {
            participantData[0].shareAmount = Number((participantData[0].shareAmount + diff).toFixed(2));
        }
    } else if (splitType === "SHARES") {
        let totalShares = 0;
        participants.forEach((p) => {
            totalShares += Number(p.shares || 0);
        });

        if (totalShares <= 0) {
            throw new Error("Total shares must be greater than 0.");
        }

        let shareSum = 0;
        participantData = participants.map((p) => {
            const shares = Number(p.shares || 0);
            const amt = Number(((shares / totalShares) * parsedTotal).toFixed(2));
            shareSum += amt;
            return {
                userId: p.userId,
                shareAmount: amt,
                shares,
            };
        });

        const diff = Number((parsedTotal - shareSum).toFixed(2));
        if (Math.abs(diff) > 0.005 && participantData.length > 0) {
            participantData[0].shareAmount = Number((participantData[0].shareAmount + diff).toFixed(2));
        }
    }

    return participantData;
}

// POST /api/expenses/bulk - Add multiple shared expenses in one request and transaction
export async function POST(request: Request) {
    try {
        const payload = await getCurrentUser();
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const expenses = (body.expenses || []) as ExpenseInput[];
        const includeGroupSnapshot = Boolean(body.includeGroupSnapshot);

        if (!Array.isArray(expenses) || expenses.length === 0) {
            return NextResponse.json({ error: "Provide a non-empty expenses array." }, { status: 400 });
        }

        if (expenses.length > 100) {
            return NextResponse.json(
                { error: "Batch too large. Max 100 expenses per request." },
                { status: 400 }
            );
        }

        const uniqueGroupIds = [...new Set(expenses.map((e) => e.groupId))];
        const uniqueCategoryIds = [...new Set(expenses.map((e) => e.categoryId))];

        const [groupMembers, categories] = await Promise.all([
            prisma.groupMember.findMany({
                where: { groupId: { in: uniqueGroupIds } },
                select: { groupId: true, userId: true },
            }),
            prisma.category.findMany({
                where: { id: { in: uniqueCategoryIds } },
                select: { id: true },
            }),
        ]);

        const validCategoryIds = new Set(categories.map((c) => c.id));
        const groupMemberMap = new Map<string, Set<string>>();
        groupMembers.forEach((gm) => {
            const s = groupMemberMap.get(gm.groupId) || new Set<string>();
            s.add(gm.userId);
            groupMemberMap.set(gm.groupId, s);
        });

        const prepared: PreparedExpense[] = [];

        for (let index = 0; index < expenses.length; index += 1) {
            const current = expenses[index];
            const {
                groupId,
                title,
                description,
                totalAmount,
                paidById,
                categoryId,
                splitType,
                expenseDate,
                currency = "INR",
                receiptUrl,
                participants,
            } = current;

            if (
                !groupId ||
                !title ||
                !totalAmount ||
                !paidById ||
                !categoryId ||
                !splitType ||
                !expenseDate ||
                !participants ||
                participants.length === 0
            ) {
                return NextResponse.json(
                    { error: `Missing required fields at index ${index}.` },
                    { status: 400 }
                );
            }

            if (!validCategoryIds.has(categoryId)) {
                return NextResponse.json(
                    { error: `Invalid categoryId at index ${index}.` },
                    { status: 400 }
                );
            }

            const parsedTotal = Number(Number(totalAmount).toFixed(2));
            if (isNaN(parsedTotal) || parsedTotal <= 0) {
                return NextResponse.json(
                    { error: `Total amount must be a positive number at index ${index}.` },
                    { status: 400 }
                );
            }

            const members = groupMemberMap.get(groupId);
            if (!members) {
                return NextResponse.json(
                    { error: `Group not found or has no members at index ${index}.` },
                    { status: 400 }
                );
            }

            if (!members.has(paidById)) {
                return NextResponse.json(
                    { error: `Payer is not a member of this group at index ${index}.` },
                    { status: 400 }
                );
            }

            let participantData: PreparedExpense["participants"];
            try {
                participantData = normalizeParticipants(splitType, participants, parsedTotal);
            } catch (err: any) {
                return NextResponse.json(
                    { error: `${err.message} (index ${index})` },
                    { status: 400 }
                );
            }

            const allParticipantsAreMembers = participantData.every((p) => members.has(p.userId));
            if (!allParticipantsAreMembers) {
                return NextResponse.json(
                    { error: `One or more participants are not group members at index ${index}.` },
                    { status: 400 }
                );
            }

            prepared.push({
                id: crypto.randomUUID(),
                groupId,
                title,
                description: description || "",
                totalAmount: parsedTotal,
                paidById,
                categoryId,
                splitType,
                expenseDate: new Date(expenseDate),
                currency,
                receiptUrl: receiptUrl || "",
                participants: participantData,
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.expense.createMany({
                data: prepared.map((e) => ({
                    id: e.id,
                    groupId: e.groupId,
                    title: e.title,
                    description: e.description,
                    totalAmount: e.totalAmount,
                    paidById: e.paidById,
                    categoryId: e.categoryId,
                    splitType: e.splitType,
                    expenseDate: e.expenseDate,
                    currency: e.currency,
                    receiptUrl: e.receiptUrl,
                })),
            });

            await tx.expenseParticipant.createMany({
                data: prepared.flatMap((e) =>
                    e.participants.map((p) => ({
                        expenseId: e.id,
                        userId: p.userId,
                        shareAmount: p.shareAmount,
                        percentage: p.percentage || null,
                        shares: p.shares || null,
                    }))
                ),
            });
        });

        let groupSnapshot;
        if (includeGroupSnapshot && uniqueGroupIds.length === 1) {
            const groupId = uniqueGroupIds[0];
            const group = await prisma.group.findUnique({
                where: { id: groupId },
                include: {
                    members: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                        orderBy: { joinedAt: "asc" },
                    },
                    expenses: {
                        include: {
                            paidBy: { select: { id: true, name: true, email: true } },
                            category: true,
                            participants: {
                                include: {
                                    user: { select: { id: true, name: true, email: true } },
                                },
                            },
                        },
                        orderBy: { expenseDate: "desc" },
                    },
                    settlements: {
                        include: {
                            paidBy: { select: { id: true, name: true, email: true } },
                            paidTo: { select: { id: true, name: true, email: true } },
                        },
                        orderBy: { settlementDate: "desc" },
                    },
                },
            });

            if (group) {
                const balances = calculateBalances(group.members, group.expenses, group.settlements);
                const simplifiedTransactions = simplifyDebts(balances);
                groupSnapshot = {
                    group: {
                        id: group.id,
                        name: group.name,
                        description: group.description,
                        createdAt: group.createdAt,
                        createdById: group.createdById,
                    },
                    members: group.members.map((m) => ({
                        userId: m.user.id,
                        name: m.user.name,
                        email: m.user.email,
                        joinedAt: m.joinedAt,
                    })),
                    expenses: group.expenses,
                    settlements: group.settlements,
                    balances,
                    simplifiedTransactions,
                };
            }
        }

        return NextResponse.json(
            {
                message: "Bulk expenses logged successfully.",
                createdCount: prepared.length,
                expenseIds: prepared.map((e) => e.id),
                groupSnapshot,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Bulk create expenses error:", error);
        return NextResponse.json(
            { error: "An error occurred while creating expenses in bulk." },
            { status: 500 }
        );
    }
}