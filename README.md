# Quiz Forum — True or False?

A free, static quiz website (HTML + CSS + vanilla JS) with a Google Apps Script backend that writes results to **your** Google Sheet, plus a downloadable PDF participation certificate.

```
quiz-forum/
├── index.html              the website
├── css/styles.css          design (cream / navy / yellow, green TRUE, red FALSE)
├── js/config.js            ← EDIT MONTHLY: title, timer, randomisation, scriptUrl …
├── js/questions.js         ← EDIT MONTHLY: the 15 statements, answers, explanations, sources
├── js/app.js               quiz engine, timer, scoring, results, saving, certificate screen
├── js/certificate.js       PDF certificate (jsPDF)
├── js/confetti.js          lightweight confetti
├── vendor/jspdf.umd.min.js PDF library, bundled so hosting needs nothing else
├── apps-script/Code.gs     ← paste into Google Apps Script
├── admin-key.html          ADMIN ONLY: generates the answer-key block for Code.gs (don't host it)
└── tests/                  automated tests (optional): npm install && npm test
```

---

## 1. Run it locally (30 seconds)

Any static server works. With Python installed:

```
cd quiz-forum
python3 -m http.server 8080
```
Open http://localhost:8080. (Double-clicking `index.html` also mostly works, but a server is safer.)

Out of the box `scriptUrl` is empty, so the site runs in **DEMO MODE**: it says so on the welcome screen, nothing is saved, and certificates are stamped "DEMO COPY".

## 2. Free hosting (pick one)

| Option | Steps |
|---|---|
| **Netlify Drop** (easiest) | Delete `admin-key.html`, `tests/`, `node_modules/`. Go to app.netlify.com/drop, drag the folder in. You get a public link. |
| **GitHub Pages** | New public repo → upload the files (not `admin-key.html`) → Settings → Pages → Deploy from branch `main` / root. Link: `https://<you>.github.io/<repo>/`. |
| **Cloudflare Pages** | Pages → Create project → Direct Upload → upload the folder. |

Because the site is static, the page itself (including `questions.js`) is public. That is expected; see *Limitations*.

## 3. Create the Google Sheet

1. Sign in to the Google account that should own the data → https://sheets.google.com → **Blank spreadsheet**. Name it `Quiz Forum Results`.
2. Leave it empty. The script creates a tab named **Participants** with these columns:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Participant Name | Quiz Edition | Score | Total Questions | Percentage | Correct Answers | Incorrect Answers | Timed-out Questions | Certificate ID | Completion Status |

## 4. Add the server code

1. In the sheet: **Extensions → Apps Script**.
2. Delete the placeholder code, paste the whole of `apps-script/Code.gs`, click **Save** (💾). Name the project `Quiz Forum`.
3. Pick the function **`setup`** in the toolbar dropdown → **Run**. Click **Review permissions → choose your account → Advanced → Go to Quiz Forum (unsafe) → Allow**. (Google shows this warning for every personal script; you wrote it, so it is safe to allow.) The `Participants` tab and header row now exist.

## 5. Deploy as a Web App (exact steps)

1. Apps Script editor → **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" → **Web app**.
3. Description: `Quiz Forum v1`. **Execute as: Me (your email).** **Who has access: Anyone.**
4. **Deploy** → copy the **Web app URL** (ends in `/exec`).
5. Open `js/config.js`, paste it into `scriptUrl: "…"`, save, re-upload/redeploy the website.
6. Test the link: open the `/exec` URL in a browser. You should see `{"ok":true,"service":"Quiz Forum",…}`.

**Changing `Code.gs` later:** Deploy → **Manage deployments** → ✏️ edit → Version: **New version** → Deploy. The URL stays the same. (Saving the file alone does *not* update the live web app.)

### Access settings and security trade-offs
- *Anyone* is required: students are not signed in, so any narrower setting would show them a Google login. Everyone who has the URL can **submit**; nobody can **read** the sheet through it (`doGet` returns only a health check).
- The URL is visible in the page source, so a determined person could send fake submissions. Mitigations built in: server-side scoring from the answer key, strict validation, edition check, duplicate protection, and a lock against simultaneous writes. It cannot stop someone from submitting a valid perfect attempt by reading `questions.js` (see Limitations).
- Keep the Google Sheet itself **private** (don't share it). Only you see names and scores.
- No passwords, API keys or service accounts exist anywhere in the frontend.

## 6. Monthly routine
1. Edit `js/questions.js` (statements, `"TRUE"`/`"FALSE"`, explanations, sources) and `js/config.js` (`editionLabel`, `editionCode`).
2. Open `admin-key.html` on your computer → read the warnings → **Copy** → paste over `SETTINGS` + `ANSWER_KEY` in `Code.gs` → Deploy a **new version**.
3. Re-upload the site. (To keep old data tidy, make a new Google Sheet per month or just filter by *Quiz Edition*.)

## 7. Administrator workflow (viewing / exporting results)
Open the sheet → sort or filter the columns → **File → Download → CSV** (or Excel). Use *Data → Create a filter* to filter by edition. Duplicates cannot appear for the same attempt; a student who deliberately retakes the quiz creates a *new* row (set `ALLOW_MULTIPLE_ATTEMPTS_PER_NAME: false` in `Code.gs` to allow one per name per edition).

## 8. How saving and certificates behave
- A row is written **only** after a quiz is finished. Opening the site or abandoning the quiz writes nothing.
- The browser sends the answers (not a score). The server re-scores them, builds the certificate ID, appends the row and replies. The page says "saved" **only** after that reply.
- Each attempt has a random attempt ID; the certificate ID is derived from it, so resending the same attempt returns the existing record instead of adding a row.
- If saving fails (offline, timeout, server error): results stay visible, a red notice says the result is **not** saved, a **Retry saving** button appears, and the finished answers are kept in the browser's local storage so even a page refresh offers to recover them.
- **Certificate policy:** the certificate unlocks only after the server confirms the save, so the name and score on the PDF always match the official record. (`requireSaveBeforeCertificate: false` in `config.js` relaxes this; such certificates are then stamped as unrecorded.)
- The PDF uses real text (jsPDF), shrinks long names to fit, and states it is a participation certificate, not an accredited qualification. The Print button opens the PDF in a new tab with the print dialog.
- Names are limited to **English letters, spaces, `.` `'` `-`** because the PDF's built-in fonts can't draw other scripts (Tamil, Hindi etc.). The form explains this.

## 9. Test checklist (manual, ~10 minutes)
Items marked ✅ were also run automatically (`npm install && npm test`).

| # | Check | How |
|---|---|---|
| 1 | Correct answer ✅ | Tap TRUE on Q1 → green reaction, score 1 |
| 2 | Incorrect answer ✅ | Tap FALSE on Q2 → red reaction, score unchanged |
| 3 | 10-second timeout ✅ | Do nothing for 10 s → "Time's up", next question appears by itself |
| 4 | Last-question transition ✅ | Answer Q15 → results appear, no Q16 |
| 5 | Duplicate click prevention ✅ | Tap both buttons rapidly → only the first counts |
| 6 | Empty name ✅ | Press Start with nothing / spaces → error, quiz does not start |
| 7 | Long names ✅ | 55-character name → one line inside the border on the PDF |
| 8 | Sheets save success | Set `scriptUrl`, finish a quiz → green "saved", one new row |
| 9 | Network failure + retry ✅ (simulated) | Finish a quiz with Wi-Fi off → red "NOT saved" + Retry; reconnect → Retry → saved, still one row |
| 10 | Certificate PDF ✅ | Results → Generate → Download; open the PDF, check name/score/ID |
| 11 | Mobile layout | Open on a phone: buttons stack comfortably, explanations readable, timer visible |
| 12 | Tab switching | Switch tabs during a question → yellow reminder; timer keeps running |
| 13 | Refresh recovery | Finish offline, refresh → "unsaved result" banner → Resume |

## 10. Limitations (honest list)
- **Answers are readable in the page source.** The site is static and shows instant feedback, so the answer key must be in the browser. The server prevents *forged scores*, but it can't stop a student from reading `questions.js`. This is deliberate "reasonable friction" for a casual quiz. If you later need real secrecy, the server would have to deliver one question at a time and judge each answer.
- **All 15 supplied answers are TRUE**, so tapping TRUE every time scores 15/15. `questions.js` ends with suggested FALSE variants.
- Tab-switch detection is only a reminder; it does not prevent looking things up.
- Instant "correct/incorrect" feedback after each question (requested) tells students that question's answer immediately.
- One person can start another attempt; only duplicate *submissions of the same attempt* are blocked (optionally: repeated names).
- The Apps Script daily quotas for free Google accounts are far above 50 participants.
