/* ============================================================
   QUIZ FORUM — ADMIN CONFIGURATION  (edit this file monthly)
   Questions live in questions.js.
   ============================================================ */
var QF_CONFIG = {
  // ---- Titles shown on screen and on the certificate ----
  quizTitle: "Quiz Forum — True or False?",
  subtitle: "Monthly General Knowledge & Current Affairs Quiz",
  editionLabel: "September 2026",
  editionCode: "202609",
  organizerName: "Quiz Forum",
  certificateTitle: "Certificate of Participation",
  coordinatorTitle: "Quiz Forum Coordinator",
  tagline: "Big brains. Quick clicks. No time to Google!",

  // ---- Quiz rules ----
  timerSeconds: 10,          // seconds per question
  transitionMs: 450,         // pause after an answer before the next question (300-500 recommended)
  questionsPerQuiz: 15,      // how many questions each attempt uses (first N, or random N if randomised)
  pointsPerCorrect: 1,       // maximum score = questionsPerQuiz x pointsPerCorrect
  randomizeQuestions: false, // true = new random order (and subset, if pool > questionsPerQuiz) per attempt
  randomizeButtons: false,   // true = TRUE/FALSE buttons swap sides randomly (meanings never change)

  // ---- Result bands: highest matching "min" wins (written for 15 questions) ----
  bands: [
    { min: 13, title: "Quiz Legend",                emoji: "🏆", blurb: "Absolutely unreal. The facts fear you." },
    { min: 10, title: "Fact Detective",             emoji: "🕵️", blurb: "Sharp eyes, sharper instincts." },
    { min: 7,  title: "Knowledge in Progress",      emoji: "📚", blurb: "Solid effort. The explanations below will level you up." },
    { min: 0,  title: "Meme Enjoyer, Fact Learner", emoji: "🐸", blurb: "Plot twist: you now know more than before. Read on!" }
  ],

  scriptUrl: "/api/results",
  saveTimeoutMs: 20000,
  // true  = the certificate unlocks only after the server confirms the result is saved.
  // false = participants may generate a certificate even if saving failed (not recommended).
  requireSaveBeforeCertificate: true,

  // ---- Name rules ----
  nameMaxLength: 60
};

if (typeof window !== "undefined") window.QF_CONFIG = QF_CONFIG;
if (typeof module !== "undefined") module.exports = QF_CONFIG;
