import { prisma, seedCategories } from "../src/lib/db";

async function main() {
  console.log("Starting database seed...");
  await seedCategories();
  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
