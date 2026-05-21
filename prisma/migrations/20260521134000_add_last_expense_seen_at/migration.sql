ALTER TABLE "User" ADD COLUMN "lastExpenseSeenAt" DATETIME;

-- Initialize existing users so they do not receive a large one-time backlog.
UPDATE "User"
SET "lastExpenseSeenAt" = CURRENT_TIMESTAMP
WHERE "lastExpenseSeenAt" IS NULL;
