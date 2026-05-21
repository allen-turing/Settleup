import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const payload = await getCurrentUser();
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const markAsSeen = url.searchParams.get("markAsSeen") !== "false";

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, createdAt: true, lastExpenseSeenAt: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const since = user.lastExpenseSeenAt || user.createdAt;

        const groupMemberships = await prisma.groupMember.findMany({
            where: { userId: user.id },
            select: { groupId: true },
        });

        const groupIds = groupMemberships.map((g) => g.groupId);

        if (groupIds.length === 0) {
            if (markAsSeen) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastExpenseSeenAt: new Date() },
                });
            }
            return NextResponse.json({
                hasUpdates: false,
                totalNewExpenses: 0,
                updatesByGroup: [],
                since,
            });
        }

        const expenses = await prisma.expense.findMany({
            where: {
                groupId: { in: groupIds },
                paidById: { not: user.id },
                createdAt: { gt: since },
            },
            select: {
                id: true,
                title: true,
                totalAmount: true,
                createdAt: true,
                groupId: true,
                group: { select: { name: true } },
                paidBy: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const grouped = new Map<string, { groupId: string; groupName: string; count: number }>();
        for (const exp of expenses) {
            const existing = grouped.get(exp.groupId);
            if (existing) {
                existing.count += 1;
            } else {
                grouped.set(exp.groupId, {
                    groupId: exp.groupId,
                    groupName: exp.group.name,
                    count: 1,
                });
            }
        }

        if (markAsSeen) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastExpenseSeenAt: new Date() },
            });
        }

        return NextResponse.json({
            hasUpdates: expenses.length > 0,
            totalNewExpenses: expenses.length,
            updatesByGroup: Array.from(grouped.values()).sort((a, b) => b.count - a.count),
            preview: expenses.slice(0, 5).map((e) => ({
                id: e.id,
                title: e.title,
                paidByName: e.paidBy.name,
                groupName: e.group.name,
                totalAmount: Number(e.totalAmount),
                createdAt: e.createdAt,
            })),
            since,
        });
    } catch (error: any) {
        console.error("Expense notification fetch error:", error);
        return NextResponse.json(
            { error: "An error occurred while fetching notifications." },
            { status: 500 }
        );
    }
}
