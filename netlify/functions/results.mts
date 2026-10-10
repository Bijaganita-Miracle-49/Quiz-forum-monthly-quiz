import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../db/index.js";
import { quizResults } from "../../db/schema.js";
import { matchesSubmission, parseSubmission, scoreSubmission, SubmissionError } from "../../server/quiz.js";
import { syncResult } from "../../server/sync.js";
import { canSyncSheets } from "../../server/sheets.js";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export default async (request: Request) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "forbidden" }, 403);
  if (Number(request.headers.get("content-length")) > 16384) return json({ ok: false, error: "invalid_request" }, 413);
  let input: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 16384) return json({ ok: false, error: "invalid_request" }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }
  try {
    const submission = parseSubmission(input);
    const database = getDatabase();
    let [result] = await database.select().from(quizResults).where(eq(quizResults.attemptId, submission.attemptId)).limit(1);
    let duplicate = Boolean(result);
    if (!result) {
      const scored = scoreSubmission(submission);
      const [inserted] = await database.insert(quizResults).values(scored)
        .onConflictDoNothing({ target: quizResults.attemptId }).returning();
      if (inserted) result = inserted;
      else {
        [result] = await database.select().from(quizResults).where(eq(quizResults.attemptId, submission.attemptId)).limit(1);
        duplicate = true;
      }
    }
    if (!result) return json({ ok: false, error: "storage_unavailable" }, 503);
    if (!matchesSubmission(result, submission)) return json({ ok: false, error: "invalid_attempt" }, 409);
    let sheetSync: "synced" | "pending" = result.sheetSyncedAt ? "synced" : "pending";
    try {
      sheetSync = await syncResult(result);
    } catch {
      console.warn("Google Sheets sync deferred; result remains stored.");
    }
    return json({
      ok: true,
      duplicate,
      sheetSync,
      sheetSyncEnabled: canSyncSheets(),
      score: result.score,
      maxScore: result.maxScore,
      percentage: result.percentage,
      certificateId: result.certificateId,
      completedAt: result.completedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof SubmissionError) return json({ ok: false, error: error.code }, 400);
    console.warn("Quiz result storage unavailable.");
    return json({ ok: false, error: "storage_unavailable" }, 503);
  }
};

export const config: Config = { path: "/api/results" };
