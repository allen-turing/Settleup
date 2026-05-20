import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const makePrismaClient = () => {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    console.log("🔌 Using Turso LibSql Adapter");
    const adapter = new PrismaLibSql({
      url,
      authToken,
    });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  console.log("📂 Using Local Better-SQLite3 Adapter");
  // Resolve connection path for SQLite db file
  const rawDbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const dbPath = rawDbUrl.replace("file:", "");
  const absoluteDbPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  // Instantiate the Prisma driver adapter with the config object in Prisma 7
  const adapter = new PrismaBetterSqlite3({
    url: absoluteDbPath,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma || makePrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function seedCategories() {
  const defaultCategories = [
    { name: "Food", icon: "Utensils", color: "#FF5733" },
    { name: "Hotel", icon: "Bed", color: "#33C1FF" },
    { name: "Fuel", icon: "Fuel", color: "#FFC300" },
    { name: "Shopping", icon: "ShoppingBag", color: "#C70039" },
    { name: "Tickets", icon: "Ticket", color: "#900C3F" },
    { name: "Entertainment", icon: "Tv", color: "#8E44AD" },
    { name: "Miscellaneous", icon: "HelpCircle", color: "#7F8C8D" }
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      },
    });
  }
}
