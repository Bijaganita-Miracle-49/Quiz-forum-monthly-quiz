import { and, eq, isNull, lte, or } from "drizzle-orm";
import { getDatabase } from "../db/index.js";
import { quizResults, type QuizResult } from "../db/schema.js";
import { canSyncSheets, SheetsError, writeSheetResult } from "./sheets.js";

export function availableSyncLease(now: Date) {
  return or(isNull(quizResults.sheetLeaseUntil), lte(quizResults.sheetLeaseUntil, now));
}

export async function syncResult(result: QuizResult, budgetMs = 8000): Promise<"synced" | "pending"> {
  if (result.sheetSyncedAt) return "synced";
  if (!canSyncSheets()) return "pending";
  const database = getDatabase();
  const now = new Date();
  const [claimed] = await database.update(quizResults).set({ sheetLeaseUntil: new Date(now.getTime() + 60000) })
    .where(and(eq(quizResults.id, result.id), isNull(quizResults.sheetSyncedAt),
      lte(quizResults.sheetRetryAt, now), availableSyncLease(now))).returning();
  if (!claimed) return "pending";
  try {
    await writeSheetResult(claimed, AbortSignal.timeout(budgetMs));
    await database.update(quizResults).set({ sheetSyncedAt: new Date(), sheetSyncError: null, sheetLeaseUntil: null })
      .where(eq(quizResults.id, result.id));
    return "synced";
  } catch (error) {
    const code = error instanceof SheetsError ? error.code
      : error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "sheets_timeout" : "sheets_sync_failed";
    console.warn("Google Sheets sync deferred:", code);
    try {
      await database.update(quizResults).set({
        sheetSyncError: code,
        sheetRetryAt: new Date(Date.now() + 300000),
        sheetLeaseUntil: null,
      }).where(eq(quizResults.id, result.id));
    } catch {
      console.warn("Google Sheets retry state update deferred.");
    }
    return "pending";
  }
}
