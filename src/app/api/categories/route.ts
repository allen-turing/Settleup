import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ICON_PROFILES: Array<{ icon: string; corpus: string }> = [
  { icon: "Utensils", corpus: "food dining meal restaurant cafe breakfast lunch dinner snacks beverages" },
  { icon: "Bed", corpus: "hotel stay lodging hostel room suite accommodation rent nightly" },
  { icon: "Fuel", corpus: "fuel petrol diesel gas transport taxi cab auto ride car bike" },
  { icon: "ShoppingBag", corpus: "shopping groceries mart store market purchase buy supplies" },
  { icon: "Ticket", corpus: "ticket booking flight train bus movie event concert pass entry" },
  { icon: "Tv", corpus: "entertainment streaming ott music gaming game subscription media" },
  { icon: "Coins", corpus: "cash money coin payment coins pay bank currency cash-only" },
  { icon: "UserCircle", corpus: "personal self individual private own user custom profile" },
  { icon: "Plane", corpus: "travel flight plane trip vacation holiday tour airline flying journey" },
  { icon: "HelpCircle", corpus: "miscellaneous other general uncategorized random" },
];

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);

const levenshteinDistance = (a: string, b: string): number => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
};

const isFuzzyTokenMatch = (inputToken: string, profileToken: string): boolean => {
  if (inputToken === profileToken) return true;
  if (inputToken.length < 4 || profileToken.length < 4) return false;

  const distance = levenshteinDistance(inputToken, profileToken);
  const maxLen = Math.max(inputToken.length, profileToken.length);
  const similarity = 1 - distance / maxLen;
  return similarity >= 0.75;
};

const inferIconFromText = (categoryName: string): string => {
  const nameTokens = tokenize(categoryName);
  if (nameTokens.length === 0) return "HelpCircle";

  let bestIcon = "HelpCircle";
  let bestScore = -1;

  for (const profile of ICON_PROFILES) {
    const profileText = profile.corpus.toLowerCase();
    const profileTokens = new Set(tokenize(profile.corpus));
    let score = 0;

    for (const token of nameTokens) {
      if (profileTokens.has(token)) {
        score += 4;
        continue;
      }

      if (profileText.includes(token)) {
        score += 2;
        continue;
      }

      // Typo-tolerant match against profile tokens.
      for (const profileToken of profileTokens) {
        if (isFuzzyTokenMatch(token, profileToken)) {
          score += 2;
          break;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIcon = profile.icon;
    }
  }

  return bestScore > 0 ? bestIcon : "HelpCircle";
};

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

    // Determine icon from text instead of manual icon mapping from the client.

    const icon = inferIconFromText(cleanName);

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
