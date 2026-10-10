import type { Config } from "@netlify/functions";
import { and, asc, isNull, lte } from "drizzle-orm";
import { getDatabase } from "../../db/index.js";
import { quizResults } from "../../db/schema.js";
import { canSyncSheets } from "../../server/sheets.js";
import { availableSyncLease, syncResult } from "../../server/sync.js";

export default async () => {
  if (!canSyncSheets()) {
    console.warn("Google Sheets sync inactive: check credentials and deployment context.");
    return;
  }
  const deadline = Date.now() + 25000;
  try {
    const now = new Date();
    const pending = await getDatabase().select().from(quizResults)
      .where(and(isNull(quizResults.sheetSyncedAt), lte(quizResults.sheetRetryAt, now), availableSyncLease(now)))
      .orderBy(asc(quizResults.id)).limit(10);
    for (const result of pending) {
      const remaining = deadline - Date.now();
      if (remaining < 2000) break;
      await syncResult(result, Math.min(8000, remaining));
    }
  } catch {
    console.warn("Google Sheets retry job deferred.");
  }
};

export const config: Config = { schedule: "*/5 * * * *" };
