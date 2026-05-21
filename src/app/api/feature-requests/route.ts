import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

export async function POST(request: Request) {
    try {
        const payload = await getCurrentUser();
        const body = await request.json();

        const requesterName = String(body.requesterName || "").trim();
        const requesterEmail = String(body.requesterEmail || "").trim().toLowerCase();
        const title = String(body.title || "").trim();
        const problem = String(body.problem || "").trim();
        const expectedOutcome = String(body.expectedOutcome || "").trim();
        const workflowArea = String(body.workflowArea || "").trim();
        const priority = String(body.priority || "MEDIUM").toUpperCase();

        if (!requesterName || !requesterEmail || !title || !problem || !expectedOutcome || !workflowArea) {
            return NextResponse.json(
                { error: "Please complete all required fields." },
                { status: 400 }
            );
        }

        if (!requesterEmail.includes("@")) {
            return NextResponse.json(
                { error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        if (!VALID_PRIORITIES.has(priority)) {
            return NextResponse.json(
                { error: "Invalid priority value." },
                { status: 400 }
            );
        }

        const featureRequest = await prisma.featureRequest.create({
            data: {
                userId: payload?.userId || null,
                requesterName,
                requesterEmail,
                title,
                problem,
                expectedOutcome,
                workflowArea,
                priority,
            },
            select: {
                id: true,
                createdAt: true,
            },
        });

        return NextResponse.json(
            {
                message: "Feature request submitted successfully.",
                featureRequest,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Create feature request error:", error);
        return NextResponse.json(
            { error: "An error occurred while submitting your request." },
            { status: 500 }
        );
    }
}
