CREATE TABLE "FeatureRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "requesterName" TEXT NOT NULL,
  "requesterEmail" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "expectedOutcome" TEXT NOT NULL,
  "workflowArea" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FeatureRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "FeatureRequest_createdAt_idx" ON "FeatureRequest"("createdAt");
CREATE INDEX "FeatureRequest_priority_idx" ON "FeatureRequest"("priority");
CREATE INDEX "FeatureRequest_status_idx" ON "FeatureRequest"("status");
