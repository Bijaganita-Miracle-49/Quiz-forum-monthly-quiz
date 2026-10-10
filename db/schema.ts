import { doublePrecision, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  attemptId: text("attempt_id").notNull().unique(),
  name: text("name").notNull(),
  edition: text("edition").notNull(),
  order: jsonb("question_order").$type<string[]>().notNull(),
  answers: jsonb("answers").$type<("TRUE" | "FALSE" | null)[]>().notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  percentage: doublePrecision("percentage").notNull(),
  correct: integer("correct").notNull(),
  incorrect: integer("incorrect").notNull(),
  timedOut: integer("timed_out").notNull(),
  certificateId: text("certificate_id").notNull().unique(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  sheetSyncedAt: timestamp("sheet_synced_at", { withTimezone: true }),
  sheetSyncError: text("sheet_sync_error"),
  sheetRetryAt: timestamp("sheet_retry_at", { withTimezone: true }).notNull().defaultNow(),
  sheetLeaseUntil: timestamp("sheet_lease_until", { withTimezone: true }),
}, (table) => [index("quiz_results_pending_sync_idx").on(table.sheetSyncedAt, table.sheetRetryAt)]);

export type QuizResult = typeof quizResults.$inferSelect;
