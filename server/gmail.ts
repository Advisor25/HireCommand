/**
 * Gmail Email Journaling — HireCommand
 *
 * OAuth 2.0 flow (per recruiter):
 *   1. GET  /api/gmail/connect/:userId    → redirect to Google OAuth
 *   2. GET  /api/gmail/callback           → exchange code, store tokens
 *   3. GET  /api/gmail/status/:userId     → connection state + email address
 *   4. POST /api/gmail/disconnect/:userId → revoke + clear tokens
 *
 * Email sync:
 *   5. POST /api/gmail/sync/:userId       → fetch new emails, match to records
 *   6. GET  /api/gmail/threads/:type/:id  → get email threads for candidate or contact
 *   7. POST /api/gmail/send               → send email from CRM, log it
 *   8. GET  /api/gmail/unmatched          → emails not yet linked to any record
 *   9. POST /api/gmail/match              → manually link an email to a record
 *
 * Matching logic:
 *   - Auto-match by comparing email From/To addresses against
 *     candidates.email and contacts.email columns
 *   - Unmatched emails go to email_journal with matched=false for manual review
 *
 * Settings keys used (per user, e.g. userId=1):
 *   gmail_access_token_1
 *   gmail_refresh_token_1
 *   gmail_token_expiry_1
 *   gmail_email_address_1    — the connected Gmail address
 *   gmail_last_sync_1        — ISO timestamp of last sync
 *   gmail_history_id_1       — Gmail historyId for incremental sync
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const GMAIL_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GMAIL_API_BASE  = "https://gmail.googleapis.com/gmail/v1/users/me";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// ─── Config ───────────────────────────────────────────────────────────────────

function getGmailConfig() {
  return {
    clientId:     process.env.GMAIL_CLIENT_ID     || "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET || "",
    redirectUri:  process.env.GMAIL_REDIRECT_URI  ||
      `${process.env.APP_URL || "http://localhost:5000"}/api/gmail/callback`,
  };
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

async function getGmailSetting(userId: number, key: string): Promise<string | null> {
  try {
    return await storage.getSetting(`gmail_${key}_${userId}`) ?? null;
  } catch { return null; }
}

async function setGmailSetting(userId: number, key: string, value: string) {
  await storage.setSetting(`gmail_${key}_${userId}`, value);
}

async function clearGmailSettings(userId: number) {
  const keys = ["access_token", "refresh_token", "token_expiry", "email_address", "last_sync", "history_id"];
  for (const k of keys) {
    try { await storage.setSetting(`gmail_${k}_${userId}`, ""); } catch {}
  }
}

// ─── Token management ─────────────────────────────────────────────────────────

async function getValidAccessToken(userId: number): Promise<string | null> {
  const accessToken  = await getGmailSetting(userId, "access_token");
  const refreshToken = await getGmailSetting(userId, "refresh_token");
  const expiry       = await getGmailSetting(userId, "token_expiry");

  if (!accessToken || !refreshToken) return null;

  // Refresh if within 2 minutes of expiry
  const expiryTime = expiry ? new Date(expiry).getTime() : 0;
  if (Date.now() < expiryTime - 2 * 60 * 1000) return accessToken;

  // Refresh
  const { clientId, clientSecret } = getGmailConfig();
  const resp = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) {
    console.error("[Gmail] Token refresh failed:", await resp.text());
    return null;
  }

  const data = await resp.json() as {
    access_token: string; expires_in: number;
  };

  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await setGmailSetting(userId, "access_token",  data.access_token);
  await setGmailSetting(userId, "token_expiry",  newExpiry);

  return data.access_token;
}

// ─── Gmail API helpers ────────────────────────────────────────────────────────

async function gmailGet(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${GMAIL_API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Gmail API error ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function gmailPost(token: string, path: string, body: unknown) {
  const resp = await fetch(`${GMAIL_API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Gmail API error ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

// ─── Email parsing ────────────────────────────────────────────────────────────

interface ParsedEmail {
  gmailId:     string;
  threadId:    string;
  subject:     string;
  fromName:    string;
  fromEmail:   string;
  toEmails:    string[];
  ccEmails:    string[];
  bodyText:    string;
  bodyHtml:    string;
  sentAt:      string;
  labelIds:    string[];
  snippet:     string;
}

function extractHeader(headers: Array<{name: string; value: string}>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim().toLowerCase() };
  return { name: "", email: raw.trim().toLowerCase() };
}

function parseEmailAddresses(raw: string): string[] {
  return raw.split(/,\s*/).map(a => parseEmailAddress(a).email).filter(Boolean);
}

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  } catch { return ""; }
}

function extractBody(payload: any): { text: string; html: string } {
  let text = "", html = "";

  function walk(part: any) {
    if (!part) return;
    const mime = part.mimeType || "";
    const body = part.body?.data ? decodeBase64(part.body.data) : "";

    if (mime === "text/plain" && body) text = body;
    else if (mime === "text/html" && body) html = body;
    else if (mime.startsWith("multipart/") && part.parts) {
      part.parts.forEach(walk);
    }
  }

  walk(payload);
  return { text, html };
}

function parseGmailMessage(msg: any): ParsedEmail {
  const headers = msg.payload?.headers || [];
  const from    = parseEmailAddress(extractHeader(headers, "from"));
  const toRaw   = extractHeader(headers, "to");
  const ccRaw   = extractHeader(headers, "cc");
  const dateStr = extractHeader(headers, "date");
  const { text, html } = extractBody(msg.payload);

  return {
    gmailId:   msg.id,
    threadId:  msg.threadId,
    subject:   extractHeader(headers, "subject"),
    fromName:  from.name,
    fromEmail: from.email,
    toEmails:  parseEmailAddresses(toRaw),
    ccEmails:  parseEmailAddresses(ccRaw),
    bodyText:  text.slice(0, 10000), // cap at 10k chars
    bodyHtml:  html.slice(0, 50000),
    sentAt:    dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
    labelIds:  msg.labelIds || [],
    snippet:   msg.snippet  || "",
  };
}

// ─── Matching logic ───────────────────────────────────────────────────────────

interface MatchResult {
  candidateId?: number;
  candidateName?: string;
  contactId?: number;
  contactName?: string;
  matched: boolean;
}

async function matchEmailToRecord(email: ParsedEmail): Promise<MatchResult> {
  // Collect all email addresses involved in this email
  const allAddresses = [
    email.fromEmail,
    ...email.toEmails,
    ...email.ccEmails,
  ].filter(Boolean).map(e => e.toLowerCase());

  // Check candidates
  const candidates = await storage.getCandidates();
  for (const c of candidates) {
    if (c.email && allAddresses.includes(c.email.toLowerCase())) {
      return { candidateId: c.id, candidateName: c.name, matched: true };
    }
  }

  // Check contacts (clients / hiring managers)
  const contacts = await storage.getContacts();
  for (const ct of contacts) {
    if (ct.email && allAddresses.includes(ct.email.toLowerCase())) {
      return {
        contactId: ct.id,
        contactName: `${ct.firstName} ${ct.lastName}`,
        matched: true,
      };
    }
  }

  return { matched: false };
}

// ─── Core sync function ───────────────────────────────────────────────────────

async function syncGmailForUser(userId: number): Promise<{
  synced: number; matched: number; unmatched: number; errors: string[];
}> {
  const token = await getValidAccessToken(userId);
  if (!token) throw new Error("No valid Gmail token for user " + userId);

  const stats = { synced: 0, matched: 0, unmatched: 0, errors: [] as string[] };
  const lastHistoryId = await getGmailSetting(userId, "history_id");

  let messageIds: string[] = [];

  if (lastHistoryId) {
    // Incremental sync using Gmail History API
    try {
      const history = await gmailGet(token, "/history", {
        startHistoryId: lastHistoryId,
        historyTypes: "messageAdded",
      }) as any;

      if (history.history) {
        for (const h of history.history) {
          for (const m of (h.messagesAdded || [])) {
            messageIds.push(m.message.id);
          }
        }
      }

      if (history.historyId) {
        await setGmailSetting(userId, "history_id", history.historyId);
      }
    } catch (e: any) {
      // historyId expired — fall back to full sync
      console.warn("[Gmail] History sync failed, falling back to full sync:", e.message);
      lastHistoryId && await setGmailSetting(userId, "history_id", "");
      messageIds = await fetchRecentMessageIds(token);
    }
  } else {
    // First sync — fetch last 7 days
    messageIds = await fetchRecentMessageIds(token);
  }

  // Get already-synced Gmail IDs to avoid duplicates
  const existingIds = await storage.getEmailJournalGmailIds();
  const newIds = messageIds.filter(id => !existingIds.has(id));

  // Fetch and process each message
  for (const msgId of newIds.slice(0, 100)) { // cap at 100 per sync
    try {
      const msg = await gmailGet(token, `/messages/${msgId}`, {
        format: "full",
      });

      const parsed  = parseGmailMessage(msg);
      const match   = await matchEmailToRecord(parsed);

      await storage.createEmailJournalEntry({
        gmailId:       parsed.gmailId,
        threadId:      parsed.threadId,
        userId,
        subject:       parsed.subject,
        fromName:      parsed.fromName,
        fromEmail:     parsed.fromEmail,
        toEmails:      JSON.stringify(parsed.toEmails),
        ccEmails:      JSON.stringify(parsed.ccEmails),
        bodyText:      parsed.bodyText,
        bodyHtml:      parsed.bodyHtml,
        snippet:       parsed.snippet,
        sentAt:        parsed.sentAt,
        labelIds:      JSON.stringify(parsed.labelIds),
        candidateId:   match.candidateId ?? null,
        candidateName: match.candidateName ?? null,
        contactId:     match.contactId ?? null,
        contactName:   match.contactName ?? null,
        matched:       match.matched,
      });

      // Create activity entry if matched
      if (match.matched) {
        const isInbound = parsed.fromEmail !== (await getGmailSetting(userId, "email_address"))?.toLowerCase();
        const direction = isInbound ? "↓ Received" : "↑ Sent";
        await storage.createActivity({
          type:        "email",
          description: `${direction}: ${parsed.subject || "(no subject)"} — ${parsed.snippet}`,
          timestamp:   parsed.sentAt,
          relatedName: match.candidateName || match.contactName || "",
          candidateId: match.candidateId ?? null,
        });

        stats.matched++;
      } else {
        stats.unmatched++;
      }

      stats.synced++;
    } catch (e: any) {
      stats.errors.push(`Message ${msgId}: ${e.message}`);
    }
  }

  await setGmailSetting(userId, "last_sync", new Date().toISOString());
  return stats;
}

async function fetchRecentMessageIds(token: string): Promise<string[]> {
  // Fetch emails from the past 7 days — candidates AND clients
  const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const query = `after:${sevenDaysAgo} -label:spam -label:promotions`;

  const data = await gmailGet(token, "/messages", {
    q: query,
    maxResults: "200",
  }) as { messages?: Array<{ id: string }>; nextPageToken?: string; historyId?: string };

  if (data.historyId) {
    // Will be saved by caller — pass back via side channel isn't clean,
    // but we return just IDs here; historyId saved in syncGmailForUser
  }

  return (data.messages || []).map(m => m.id);
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerGmailRoutes(app: Express) {

  // ── OAuth: start connection ──────────────────────────────────────────────
  app.get("/api/gmail/connect/:userId", (req: Request, res: Response) => {
    const { clientId, redirectUri } = getGmailConfig();
    if (!clientId) {
      return res.status(500).json({ error: "GMAIL_CLIENT_ID not configured" });
    }

    const userId = req.params.userId;
    const state  = Buffer.from(JSON.stringify({ userId })).toString("base64");

    const url = new URL(GMAIL_AUTH_URL);
    url.searchParams.set("client_id",     clientId);
    url.searchParams.set("redirect_uri",  redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope",         GMAIL_SCOPES);
    url.searchParams.set("access_type",   "offline");
    url.searchParams.set("prompt",        "consent");
    url.searchParams.set("state",         state);

    res.redirect(url.toString());
  });

  // ── OAuth: callback ──────────────────────────────────────────────────────
  app.get("/api/gmail/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;
    const appUrl = process.env.APP_URL || "http://localhost:5000";

    if (error) {
      return res.redirect(`${appUrl}/settings?gmail_error=${encodeURIComponent(error)}`);
    }

    let userId = 1;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      userId = parseInt(decoded.userId) || 1;
    } catch {}

    const { clientId, clientSecret, redirectUri } = getGmailConfig();

    try {
      // Exchange code for tokens
      const tokenResp = await fetch(GMAIL_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id:     clientId,
          client_secret: clientSecret,
          redirect_uri:  redirectUri,
          grant_type:    "authorization_code",
        }),
      });

      if (!tokenResp.ok) throw new Error(await tokenResp.text());

      const tokens = await tokenResp.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await setGmailSetting(userId, "access_token",  tokens.access_token);
      await setGmailSetting(userId, "refresh_token", tokens.refresh_token);
      await setGmailSetting(userId, "token_expiry",  expiry);

      // Fetch connected email address
      const profileResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await profileResp.json() as { email: string };
      await setGmailSetting(userId, "email_address", profile.email || "");

      // Kick off initial sync in background
      syncGmailForUser(userId).catch(e =>
        console.error("[Gmail] Initial sync error:", e.message)
      );

      res.redirect(`${appUrl}/settings?gmail_connected=1`);
    } catch (e: any) {
      console.error("[Gmail] OAuth callback error:", e.message);
      res.redirect(`${appUrl}/settings?gmail_error=${encodeURIComponent(e.message)}`);
    }
  });

  // ── Status ───────────────────────────────────────────────────────────────
  app.get("/api/gmail/status/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId) || 1;
    const emailAddress = await getGmailSetting(userId, "email_address");
    const lastSync     = await getGmailSetting(userId, "last_sync");
    const accessToken  = await getGmailSetting(userId, "access_token");

    res.json({
      connected:    !!accessToken && !!emailAddress,
      emailAddress: emailAddress || null,
      lastSync:     lastSync || null,
    });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  app.post("/api/gmail/disconnect/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId) || 1;
    const token  = await getGmailSetting(userId, "access_token");

    if (token) {
      try {
        await fetch(`${GMAIL_REVOKE_URL}?token=${token}`, { method: "POST" });
      } catch {}
    }

    await clearGmailSettings(userId);
    res.json({ disconnected: true });
  });

  // ── Manual sync ──────────────────────────────────────────────────────────
  app.post("/api/gmail/sync/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId) || 1;
    try {
      const stats = await syncGmailForUser(userId);
      res.json({ success: true, ...stats });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Get email threads for a candidate ────────────────────────────────────
  app.get("/api/gmail/threads/candidate/:id", async (req: Request, res: Response) => {
    try {
      const candidateId = parseInt(req.params.id);
      const threads = await storage.getEmailJournalForCandidate(candidateId);
      res.json(threads);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Get email threads for a contact ─────────────────────────────────────
  app.get("/api/gmail/threads/contact/:id", async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.id);
      const threads = await storage.getEmailJournalForContact(contactId);
      res.json(threads);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Get unmatched emails ─────────────────────────────────────────────────
  app.get("/api/gmail/unmatched", async (req: Request, res: Response) => {
    try {
      const unmatched = await storage.getUnmatchedEmails();
      res.json(unmatched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Manually link email to a record ─────────────────────────────────────
  app.post("/api/gmail/match", async (req: Request, res: Response) => {
    try {
      const { emailId, candidateId, contactId } = req.body as {
        emailId: number;
        candidateId?: number;
        contactId?: number;
      };

      const updated = await storage.matchEmailJournalEntry(emailId, { candidateId, contactId });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Send email from CRM ──────────────────────────────────────────────────
  app.post("/api/gmail/send", async (req: Request, res: Response) => {
    try {
      const {
        userId = 1,
        to,
        subject,
        body,
        candidateId,
        contactId,
      } = req.body as {
        userId: number;
        to: string;
        subject: string;
        body: string;
        candidateId?: number;
        contactId?: number;
      };

      const token = await getValidAccessToken(userId);
      if (!token) return res.status(401).json({ error: "Gmail not connected for this user" });

      const senderEmail = await getGmailSetting(userId, "email_address") || "";

      // Build RFC 2822 message
      const raw = [
        `From: ${senderEmail}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body,
      ].join("\r\n");

      const encoded = Buffer.from(raw).toString("base64")
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const sent = await gmailPost(token, "/messages/send", { raw: encoded }) as any;

      // Log it in the journal
      const now = new Date().toISOString();
      await storage.createEmailJournalEntry({
        gmailId:       sent.id,
        threadId:      sent.threadId,
        userId,
        subject,
        fromName:      "",
        fromEmail:     senderEmail,
        toEmails:      JSON.stringify([to]),
        ccEmails:      JSON.stringify([]),
        bodyText:      body,
        bodyHtml:      "",
        snippet:       body.slice(0, 200),
        sentAt:        now,
        labelIds:      JSON.stringify(["SENT"]),
        candidateId:   candidateId ?? null,
        candidateName: null,
        contactId:     contactId ?? null,
        contactName:   null,
        matched:       !!(candidateId || contactId),
      });

      // Create activity
      if (candidateId || contactId) {
        const candidate = candidateId ? await storage.getCandidate(candidateId) : null;
        const relatedName = candidate?.name || to;
        await storage.createActivity({
          type:        "email",
          description: `↑ Sent: ${subject}`,
          timestamp:   now,
          relatedName,
          candidateId: candidateId ?? null,
        });
      }

      res.json({ sent: true, gmailId: sent.id, threadId: sent.threadId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Sync all connected users (called by background job) ──────────────────
  app.post("/api/gmail/sync-all", async (_req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      const results: Record<string, unknown> = {};

      for (const user of users) {
        const hasToken = await getGmailSetting(user.id, "access_token");
        if (!hasToken) continue;
        try {
          results[user.id] = await syncGmailForUser(user.id);
        } catch (e: any) {
          results[user.id] = { error: e.message };
        }
      }

      res.json({ results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}

// ─── Background sync scheduler ────────────────────────────────────────────────

export function startGmailSyncScheduler() {
  const INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

  setInterval(async () => {
    try {
      const users = await storage.getUsers();
      for (const user of users) {
        const hasToken = await storage.getSetting(`gmail_access_token_${user.id}`);
        if (!hasToken) continue;
        syncGmailForUser(user.id).catch(e =>
          console.error(`[Gmail] Background sync error for user ${user.id}:`, e.message)
        );
      }
    } catch (e: any) {
      console.error("[Gmail] Scheduler error:", e.message);
    }
  }, INTERVAL_MS);

  console.log("[Gmail] Background sync scheduler started (every 15 min)");
}
