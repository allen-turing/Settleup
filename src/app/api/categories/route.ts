import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/categories - Fetch all categories for expense forms
export async function GET() {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch categories error:", error);
    return NextResponse.json(
      { error: "An error occurred fetching categories." },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new custom category
export async function POST(request: Request) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // Check if category already exists (case-insensitive check or direct unique check)
    // Since prisma field is @unique, we can do a direct look up by lowercase email-style unique constraint or look up
    const existing = await prisma.category.findFirst({
      where: {
        name: {
          equals: cleanName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { category: existing, message: "Category already exists." },
        { status: 200 }
      );
    }

    // Determine a premium icon keyword based on name keywords
    let icon = "HelpCircle";
    const lowerName = cleanName.toLowerCase();
    
    if (lowerName.includes("food") || lowerName.includes("eat") || lowerName.includes("drink") || lowerName.includes("restaurant") || lowerName.includes("cafe")) {
      icon = "Utensils";
    } else if (lowerName.includes("hotel") || lowerName.includes("stay") || lowerName.includes("room") || lowerName.includes("rent") || lowerName.includes("bed")) {
      icon = "Bed";
    } else if (lowerName.includes("fuel") || lowerName.includes("petrol") || lowerName.includes("diesel") || lowerName.includes("gas") || lowerName.includes("cab") || lowerName.includes("car")) {
      icon = "Fuel";
    } else if (lowerName.includes("shop") || lowerName.includes("buy") || lowerName.includes("grocery") || lowerName.includes("store") || lowerName.includes("bag")) {
      icon = "ShoppingBag";
    } else if (lowerName.includes("ticket") || lowerName.includes("movie") || lowerName.includes("show") || lowerName.includes("flight") || lowerName.includes("train")) {
      icon = "Ticket";
    } else if (lowerName.includes("tv") || lowerName.includes("ott") || lowerName.includes("netflix") || lowerName.includes("music") || lowerName.includes("game")) {
      icon = "Tv";
    }

    const newCategory = await prisma.category.create({
      data: {
        name: cleanName,
        icon,
      },
    });

    return NextResponse.json(
      { category: newCategory, message: "Category created successfully." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "An error occurred creating the category." },
      { status: 500 }
    );
  }
}
