import { createHash } from "node:crypto";
import quizConfig from "../config.js";
import questionBank from "../questions.js";
import type { QuizResult } from "../db/schema.js";

export type Submission = {
  action: "submit";
  attemptId: string;
  name: string;
  edition: string;
  order: string[];
  answers: ("TRUE" | "FALSE" | null)[];
};

export class SubmissionError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function parseSubmission(input: unknown): Submission {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new SubmissionError("invalid_request");
  const payload = input as Record<string, unknown>;
  if (payload.action !== "submit") throw new SubmissionError("invalid_request");
  if (typeof payload.attemptId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]{15,79}$/.test(payload.attemptId)) {
    throw new SubmissionError("invalid_attempt");
  }
  if (typeof payload.name !== "string" || payload.name !== payload.name.trim() || payload.name.length < 2 ||
      payload.name.length > quizConfig.nameMaxLength || !/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'’\-]*$/.test(payload.name)) {
    throw new SubmissionError("invalid_name");
  }
  if (typeof payload.edition !== "string" || payload.edition.length > 100) throw new SubmissionError("edition_mismatch");
  if (!Array.isArray(payload.order) || !Array.isArray(payload.answers) || payload.order.length < 1 ||
      payload.order.length > 100 || payload.order.length !== payload.answers.length ||
      payload.order.some((questionId) => typeof questionId !== "string" || questionId.length > 80) ||
      new Set(payload.order).size !== payload.order.length ||
      payload.answers.some((answer) => answer !== "TRUE" && answer !== "FALSE" && answer !== null)) {
    throw new SubmissionError("invalid_answers");
  }
  return payload as Submission;
}

export function scoreSubmission(submission: Submission) {
  if (submission.edition !== quizConfig.editionLabel) throw new SubmissionError("edition_mismatch");
  const totalQuestions = Math.min(quizConfig.questionsPerQuiz, questionBank.length);
  if (submission.order.length !== totalQuestions) throw new SubmissionError("invalid_answers");
  let correct = 0;
  let timedOut = 0;
  submission.order.forEach((questionId, position) => {
    const question = questionBank.find((entry) => entry.id === questionId);
    if (!question || (!quizConfig.randomizeQuestions && questionBank[position].id !== questionId)) {
      throw new SubmissionError("invalid_answers");
    }
    const answer = submission.answers[position];
    if (answer === null) timedOut++;
    else if (answer === question.answer) correct++;
  });
  const score = correct * quizConfig.pointsPerCorrect;
  const maxScore = totalQuestions * quizConfig.pointsPerCorrect;
  const certificateSuffix = createHash("sha256").update(submission.attemptId).digest("hex").slice(0, 20).toUpperCase();
  return {
    attemptId: submission.attemptId,
    name: submission.name,
    edition: submission.edition,
    order: submission.order,
    answers: submission.answers,
    score,
    maxScore,
    totalQuestions,
    percentage: maxScore ? Math.round(score / maxScore * 1000) / 10 : 0,
    correct,
    incorrect: totalQuestions - correct - timedOut,
    timedOut,
    certificateId: `QF-${quizConfig.editionCode}-${certificateSuffix}`,
  };
}

export function matchesSubmission(result: QuizResult, submission: Submission) {
  return result.name === submission.name && result.edition === submission.edition &&
    JSON.stringify(result.order) === JSON.stringify(submission.order) &&
    JSON.stringify(result.answers) === JSON.stringify(submission.answers);
}
