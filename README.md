# Quiz Forum — True or False?

A monthly quiz with a static HTML/CSS/JavaScript frontend, server-validated results, and PDF participation certificates. A Netlify Function saves each completed attempt in Netlify Database and copies its result to the organiser's Google Sheet using a Google service account. No Google credentials are sent to the browser.

## Google Sheets setup (required before live sync)

The default destination is the supplied spreadsheet:
https://docs.google.com/spreadsheets/d/1mqdgd8f86I0JzTsjC0Ht17qnTbZ873hyvVh9xH8GvXU/edit

1. In Google Cloud Console, create or select a project and enable the **Google Sheets API**.
2. Create a **service account** for this integration and obtain its JSON key through Google's service-account key settings. If your organisation disables key creation, ask its administrator for an approved setup rather than changing that policy.
3. Open the spreadsheet's **Share** dialog and grant the service account's email **Editor** access. A public sharing link alone does not permit API writes. Keep participant results private; the sheet does not need to be public.
4. In Netlify **Project configuration → Environment variables**, add the following with **Functions** scope for the production context:

| Variable | What to configure |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The service-account JSON's `client_email` field |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | The JSON's `private_key` field, kept only in Netlify's secure environment-variable settings |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Optional override; the supplied spreadsheet ID is already the backend default |
| `GOOGLE_SHEETS_TAB` | Optional override; defaults to `Netlify Quiz Results` |

The private key supports both actual newlines and literal escaped \n sequences. Never paste a key into chat, commit the JSON key, put it in `config.js`, or share it in screenshots. Rotate a key through Google Cloud if it is exposed.

5. Publish a new Netlify deployment after setting the variables. Netlify installs the dependencies and applies the generated database migration during deployment. No Apps Script deployment or separate application server is required.
6. Complete a quiz on the published site. The backend creates a dedicated **Netlify Quiz Results** tab and writes its header and result. Existing tabs are not modified.

The tab is managed by this site's database. Do not delete its headers, reorder its physical rows, or use the same tab for another site or database. Use filter views or a separate reporting tab for sorting and analysis. Every result uses a stable row based on its database ID, so retries update that row rather than appending duplicates. The backend refuses to overwrite a row belonging to a different attempt or a tab with unexpected headers.

Google's service-account authorization reference:
https://developers.google.com/identity/protocols/oauth2/service-account

## Saving, retries, and certificates

- The browser submits the participant's name, edition, question order, answers, and attempt ID to `POST /api/results`. The backend validates the submission and calculates the score from the same question bank used by the frontend; a submitted score is not trusted.
- The attempt is saved to Netlify Database **before** Google Sheets is contacted. This is the authoritative result, so a Sheets outage does not lose completed attempts.
- Repeating an identical attempt ID returns the original record and certificate ID. Reusing that ID with different answers or participant details is rejected. Separate attempts by the same name are allowed.
- The page distinguishes **saved securely, Google Sheets copy pending** from a submission that failed to reach database storage. A certificate unlocks after the authoritative result is stored, even if its Sheets copy is pending.
- Google writes are attempted immediately. Pending copies are retried by a scheduled Netlify Function every five minutes, up to ten eligible attempts per invocation. Leases prevent concurrent workers from processing the same attempt. Failed attempts retain a safe diagnostic code in the database and remain queued.
- If database storage or the browser's submission fails, the page offers **Retry saving**. The existing browser recovery feature retains an unsent attempt on that device when local storage is available; it is not an official stored result.
- There is no public endpoint to list names or results. The Google key and OAuth access tokens remain server-side. Google values are written as literal values, not formulas.

## Deployment previews and local development

Google Sheets writes are disabled outside production by default so preview database IDs cannot overwrite production rows. Scheduled retries run only on published production deployments.

For an explicit integration test in a deploy preview or Netlify Dev, set `GOOGLE_SHEETS_SYNC_PREVIEWS=true` and provide Google credentials in that context. **Also select a separate test spreadsheet or dedicated test tab** using `GOOGLE_SHEETS_SPREADSHEET_ID` or `GOOGLE_SHEETS_TAB`. A preview's pending copies need a manual invocation of the scheduled function through Netlify's tooling or an identical submission retry; production scheduling does not run in previews.

Install dependencies with `npm install` and start Netlify Dev on port 8889:

`netlify dev --port 8889`

A simple static server can display the quiz but cannot serve the result-saving endpoint. Demo mode is available by clearing `scriptUrl` in `config.js`; demo results are not recorded and certificates are marked as demo copies.

## Project layout and monthly updates

- `index.html`, `styles.css`, `app.js`: quiz screens and interaction.
- `config.js`, `questions.js`: monthly settings and question bank, shared by the browser and backend.
- `certificate.js`, `jspdf.umd.min.js`, `confetti.js`: certificates and completion effects.
- `db/schema.ts`, `db/index.ts`: authoritative result storage and the database client.
- `server/quiz.ts`, `server/sheets.ts`, `server/sync.ts`: validation, Google authorization, and retryable writes.
- `netlify/functions/results.mts`, `netlify/functions/sync-sheets.mts`: submission API and scheduled retries.
- `netlify/database/migrations/`: generated migrations applied by Netlify.

For each edition, update `editionLabel`, `editionCode`, quiz settings in `config.js`, and the statements, answers, explanations, and sources in `questions.js`, then deploy them together. No separate answer-key update is needed. Previously stored attempts retain their original scores and certificates.

For schema changes, update `db/schema.ts` and generate a migration with `npm run db:generate -- --name describe_change`. Do not manually apply migration SQL. Run `npm run typecheck` to validate server types without building.

## Verification and troubleshooting

After configuring Google credentials and publishing:

1. Finish a quiz and verify the server confirms storage, the sheet gets one result, and the PDF uses the official score and certificate ID.
2. Retry the identical submission: neither the database nor the sheet should gain another attempt.
3. Temporarily revoke sheet access for a controlled test. New results should remain stored with Sheets pending. Restore access and confirm the scheduled job fills the same rows.
4. Test offline completion and browser recovery; reconnect and retry.
5. Check mobile layout, answer timeouts, tab-switch reminders, and certificate downloads.

If the page says the **Sheets copy is pending**, check the production Function environment-variable scopes, Sheets API activation, spreadsheet sharing with the service account, and the destination tab. Function logs contain only safe error codes, never raw Google responses, private keys, tokens, or participant details. Common codes include `sheets_auth_failed`, `sheets_permission_denied`, `sheets_not_found`, `sheets_header_mismatch`, `sheets_row_conflict`, and `sheets_timeout`.

If the page says **the result has NOT been saved**, the database request itself failed. Confirm that the Netlify Function and database migration deployed successfully, then retry the stored browser attempt. Static-only hosting no longer provides result saving.

## Limitations

This is a casual quiz, not a secure examination system. The answer key is public for immediate feedback, the countdown and tab-switch reminder are enforced in the browser, and participants can start another attempt. The server validates submitted answers and calculates scores but cannot prevent reading the answer key or enforce a real-world identity. PDF fonts limit participant names to supported Latin characters. Google API quotas or access failures can delay the Sheets copy without losing the authoritative result.
