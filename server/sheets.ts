import { sign } from "node:crypto";
import type { QuizResult } from "../db/schema.js";

type SheetProperties = { sheetId: number; title: string; gridProperties: { rowCount: number } };
type SheetsMetadata = { sheets: { properties: SheetProperties }[] };
type SheetValues = { values?: (string | number)[][] };

export class SheetsError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function canSyncSheets() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) &&
    (process.env.CONTEXT === "production" || process.env.GOOGLE_SHEETS_SYNC_PREVIEWS === "true");
}

export function sheetHeaders() {
  return ["Timestamp", "Participant Name", "Quiz Edition", "Score", "Total Questions", "Percentage",
    "Correct Answers", "Incorrect Answers", "Timed-out Questions", "Certificate ID", "Completion Status",
    "Attempt ID", "Maximum Score"];
}

export function sheetRow(result: QuizResult) {
  return [result.completedAt.toISOString(), result.name, result.edition, result.score, result.totalQuestions,
    result.percentage, result.correct, result.incorrect, result.timedOut, result.certificateId, "Completed",
    result.attemptId, result.maxScore];
}

async function getAccessToken(signal: AbortSignal) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new SheetsError("sheets_not_configured");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const unsigned = `${header}.${claims}`;
  let signature: string;
  try {
    signature = sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
  } catch {
    throw new SheetsError("sheets_invalid_credentials");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    signal,
  });
  if (!response.ok) throw new SheetsError("sheets_auth_failed");
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new SheetsError("sheets_auth_failed");
  return data.access_token;
}

export async function writeSheetResult(result: QuizResult, signal: AbortSignal) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1mqdgd8f86I0JzTsjC0Ht17qnTbZ873hyvVh9xH8GvXU";
  const tabName = process.env.GOOGLE_SHEETS_TAB || "Netlify Quiz Results";
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(spreadsheetId) || !tabName.trim() || tabName.length > 100) {
    throw new SheetsError("sheets_invalid_settings");
  }
  const accessToken = await getAccessToken(signal);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const rangePrefix = `'${tabName.replace(/'/g, "''")}'!`;
  const rangeUrl = (range: string) => `/values/${encodeURIComponent(rangePrefix + range)}`;
  const api = async <ResponseData>(path: string, method = "GET", body?: unknown): Promise<ResponseData> => {
    const response = await fetch(base + path, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      const code = response.status === 403 ? "sheets_permission_denied"
        : response.status === 404 ? "sheets_not_found"
        : response.status === 429 ? "sheets_rate_limited" : "sheets_request_failed";
      throw new SheetsError(code);
    }
    return await response.json() as ResponseData;
  };
  const metadataPath = "?fields=sheets(properties(sheetId,title,gridProperties(rowCount)))";
  let metadata = await api<SheetsMetadata>(metadataPath);
  let tab = metadata.sheets.find((sheet) => sheet.properties.title === tabName)?.properties;
  if (!tab) {
    try {
      const response = await api<{ replies: { addSheet?: { properties: SheetProperties } }[] }>(":batchUpdate", "POST", {
        requests: [{ addSheet: { properties: { title: tabName, gridProperties: { rowCount: 1000, columnCount: 13 } } } }],
      });
      tab = response.replies[0]?.addSheet?.properties;
    } catch (error) {
      if (!(error instanceof SheetsError) || error.code !== "sheets_request_failed") throw error;
      metadata = await api<SheetsMetadata>(metadataPath);
      tab = metadata.sheets.find((sheet) => sheet.properties.title === tabName)?.properties;
    }
    if (!tab) throw new SheetsError("sheets_tab_unavailable");
  }
  const header = await api<SheetValues>(rangeUrl("A1:M1"));
  if (!header.values?.[0]?.some((cell) => cell !== "")) {
    const contents = await api<SheetValues>(rangeUrl("A2:M"));
    if (contents.values?.some((row) => row.some((cell) => cell !== ""))) throw new SheetsError("sheets_header_mismatch");
    await api(rangeUrl("A1:M1") + "?valueInputOption=RAW", "PUT", { values: [sheetHeaders()] });
  } else if (JSON.stringify(header.values[0]) !== JSON.stringify(sheetHeaders())) {
    throw new SheetsError("sheets_header_mismatch");
  }
  const rowNumber = result.id + 1;
  if (rowNumber > tab.gridProperties.rowCount) {
    await api(":batchUpdate", "POST", {
      requests: [{ appendDimension: { sheetId: tab.sheetId, dimension: "ROWS", length: rowNumber - tab.gridProperties.rowCount + 100 } }],
    });
  }
  const range = `A${rowNumber}:M${rowNumber}`;
  const existing = await api<SheetValues>(rangeUrl(range));
  const existingRow = existing.values?.[0];
  if (existingRow?.some((cell) => cell !== "") && existingRow[11] !== result.attemptId) {
    throw new SheetsError("sheets_row_conflict");
  }
  await api(rangeUrl(range) + "?valueInputOption=RAW", "PUT", { values: [sheetRow(result)] });
}
