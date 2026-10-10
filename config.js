/* ============================================================
   QUIZ FORUM — ADMIN CONFIGURATION  (edit this file monthly)
   Questions live in js/questions.js. Nothing else needs editing.
   ============================================================ */
window.QF_CONFIG = {
  // ---- Titles shown on screen and on the certificate ----
  quizTitle: "Quiz Forum — True or False?",
  subtitle: "Monthly General Knowledge & Current Affairs Quiz",
  editionLabel: "September 2026",        // must match EDITION in apps-script/Code.gs
  editionCode: "202609",                 // used in certificate IDs; must match Code.gs
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

  // ---- Google Sheets backend ----
  // Paste your Apps Script Web App URL (ends with /exec) between the quotes.
  // Leave it EMPTY to run in DEMO MODE: nothing is saved and certificates are stamped "DEMO".
  scriptUrl: "https://script.google.com/macros/s/AKfycbwlmSWrncPt_U6j8mo88pWmQxRmnGR_yPOaNXAHabqsv8MIIOGhTO23eEj6XTl2mS6xSQ/exec",
  saveTimeoutMs: 20000,
  // true  = the certificate unlocks only after the server confirms the result is saved.
  // false = participants may generate a certificate even if saving failed (not recommended).
  requireSaveBeforeCertificate: true,

  // ---- Name rules ----
  nameMaxLength: 60
};
