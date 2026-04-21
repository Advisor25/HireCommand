/**
 * candidate-import.ts
 * ─────────────────────────────────────────────────────────
 * Two ToS-compliant candidate import flows:
 *
 * 1. CV / Resume Upload  — PDF or DOCX → text extraction → OpenAI parse
 *    Falls back gracefully if OPENAI_API_KEY not set (returns blank form).
 * 2. LinkedIn Import     — LinkedIn profile URL → ProxyCurl API
 *
 * Neither flow scrapes LinkedIn directly.
 */

import { type Express, type Request, type Response } from "express";
import multer from "multer";
import { storage } from "./storage";
import type { InsertCandidate } from "@shared/schema";

// ─── Multer (in-memory, max 10MB) ────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Extract text from PDF (pdfjs-dist — no test-file dependency) ─────────────
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      pages.push(pageText);
    }
    return pages.join("\n");
  } catch (err: any) {
    console.error("[cv-import] PDF parse error:", err.message);
    throw new Error(`Failed to read PDF: ${err.message}`);
  }
}

// ─── Extract text from DOCX / DOC ────────────────────────────────────────────
async function extractWordText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (err: any) {
    console.error("[cv-import] Word parse error:", err.message);
    throw new Error(`Failed to read Word document: ${err.message}`);
  }
}

// ─── Parse CV text → candidate fields (regex-first, OpenAI optional) ──────────
async function parseCvWithAI(text: string): Promise<Partial<InsertCandidate>> {
  const today = new Date().toISOString().split("T")[0];

  // Always extract structured fields with regex first — free, instant, reliable
  const email    = extractEmail(text);
  const phone    = extractPhone(text);
  const linkedin = extractLinkedIn(text);
  const name     = extractName(text);
  const title    = extractTitle(text);
  const company  = extractCompany(text);
  const location = extractLocation(text);
  const tags     = extractTags(text);
  const notes    = buildNotes(text);

  // If OpenAI key exists AND has credits, use it to improve the extraction
  // But the regex result is already returned as the full response — OpenAI only upgrades it
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: key });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Extract candidate info from CV text. Return JSON with: name, title, company, location, notes (2 sentence summary). Only return fields you are confident about.`,
          },
          { role: "user", content: text.slice(0, 4000) },
        ],
      });
      const ai = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return {
        name:     ai.name     || name,
        title:    ai.title    || title,
        company:  ai.company  || company,
        location: ai.location || location,
        email, phone, linkedin,
        notes:    ai.notes    || notes,
        tags: JSON.stringify(tags),
        matchScore: 75, status: "sourced",
        lastContact: today,
        timeline: JSON.stringify([{ date: today, event: "Imported via CV upload" }]),
      };
    } catch (err: any) {
      // OpenAI failed (quota, network, etc.) — fall through to regex result below
      console.warn("[cv-import] OpenAI unavailable, using regex extraction:", err.message);
    }
  }

  // Pure regex result — no OpenAI needed
  return {
    name, title, company, location, email, phone, linkedin, notes,
    tags: JSON.stringify(tags),
    matchScore: 75, status: "sourced",
    lastContact: today,
    timeline: JSON.stringify([{ date: today, event: "Imported via CV upload" }]),
  };
}

// ─── Smart regex extractors ───────────────────────────────────────────────────

function extractName(text: string): string {
  // Name is usually the first non-empty line, all caps or title case, 2-4 words
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    // Skip lines that look like headers, addresses, or contact info
    if (/^(resume|curriculum|cv|profile|summary|experience|education|skills|contact|address|email|phone|linkedin|http)/i.test(line)) continue;
    if (/[@\d\/\\|]/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 5) {
      // Looks like a name — title case each word
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }
  return "";
}

// Common executive/C-suite titles to scan for
const TITLE_PATTERNS = [
  /\b(Chief\s+\w+\s+Officer|CEO|CFO|COO|CTO|CMO|CHRO|CRO|CPO)\b/i,
  /\b(Vice\s+President|VP|SVP|EVP|AVP)\b[^\n]*/i,
  /\b(President|Managing\s+(Director|Partner)|General\s+Manager)\b[^\n]*/i,
  /\b(Director|Head)\s+of\b[^\n]*/i,
  /\b(Senior|Lead|Principal)\s+\w+[^\n]*/i,
  /\b(Controller|Comptroller|Treasurer|Partner|Associate|Manager|Analyst|Engineer|Consultant|Advisor)\b[^\n]*/i,
];

function extractTitle(text: string): string {
  for (const pattern of TITLE_PATTERNS) {
    const m = text.match(pattern);
    if (m) return m[0].trim().replace(/\s+/g, " ").slice(0, 80);
  }
  // Fallback: look for a line after the name that looks like a title (short, no @)
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(1, 10)) {
    if (line.length < 80 && !/@/.test(line) && /\b(at|of|for|and|&|–|-|\|)\b/i.test(line)) {
      return line.slice(0, 80);
    }
  }
  return "";
}

function extractCompany(text: string): string {
  // Look for "at CompanyName" or lines after experience/work header
  const atMatch = text.match(/\bat\s+([A-Z][A-Za-z0-9\s&.,'-]{2,40})/m);
  if (atMatch) return atMatch[1].trim();

  const expMatch = text.match(/(?:Experience|Employment|Work History)[^\n]*\n+([^\n]{3,60})/i);
  if (expMatch) return expMatch[1].trim();

  return "";
}

function extractLocation(text: string): string {
  // US city, state pattern — e.g. "San Francisco, CA" or "New York, NY 10001"
  const m = text.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})(?:\s+\d{5})?/);
  if (m) return `${m[1].trim()}, ${m[2]}`;

  // International — "London, UK" / "Toronto, Canada"
  const intl = text.match(/([A-Z][a-zA-Z\s]+),\s*(UK|Canada|Australia|Ireland|India|Singapore|UAE|Germany|France|Netherlands)/i);
  if (intl) return `${intl[1].trim()}, ${intl[2]}`;

  return "";
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const skillKeywords = [
    "Financial Analysis", "M&A", "Private Equity", "P&L", "GAAP", "IFRS",
    "Revenue Growth", "SaaS", "Operations", "Strategy", "Business Development",
    "Leadership", "Team Building", "Board", "Fundraising", "Budgeting",
    "Forecasting", "ERP", "Salesforce", "Marketing", "Sales", "HR", "Legal",
    "Technology", "Digital Transformation", "Supply Chain", "Procurement",
    "Real Estate", "Healthcare", "Finance", "Accounting", "Engineering",
  ];
  for (const kw of skillKeywords) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(text)) tags.push(kw);
    if (tags.length >= 6) break;
  }
  return tags;
}

function buildNotes(text: string): string {
  // Pull the first substantive paragraph (likely a summary/objective)
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 40);
  for (const line of lines.slice(0, 20)) {
    if (!/^(name|email|phone|address|linkedin|http|education|experience|skills|summary|objective)/i.test(line)) {
      return line.slice(0, 500);
    }
  }
  return "";
}

function extractEmail(text: string): string {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : "";
}
function extractPhone(text: string): string {
  const m = text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return m ? m[0] : "";
}
function extractLinkedIn(text: string): string {
  const m = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i);
  return m ? `https://www.${m[0]}` : "";
}

// ─── Fetch LinkedIn profile via ProxyCurl ─────────────────────────────────────
async function fetchLinkedInProfile(linkedinUrl: string): Promise<Partial<InsertCandidate>> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) throw new Error("PROXYCURL_API_KEY not configured in Render environment variables");

  const encoded = encodeURIComponent(linkedinUrl);
  const resp = await fetch(
    `https://nubela.co/proxycurl/api/v2/linkedin?url=${encoded}&skills=include&extra=include`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    throw new Error(`ProxyCurl error ${resp.status}: ${errText}`);
  }

  const p = (await resp.json()) as any;

  const tags: string[] = [];
  if (p.industry) tags.push(p.industry);
  if (Array.isArray(p.skills)) tags.push(...p.skills.slice(0, 4));

  const experience = Array.isArray(p.experiences) ? p.experiences : [];
  const current = experience[0];

  const notes = [p.summary, p.headline].filter(Boolean).join(" — ").slice(0, 500)
    || `LinkedIn profile for ${p.full_name}`;

  return {
    name: p.full_name || "",
    title: current?.title || p.headline || "",
    company: current?.company || "",
    location: [p.city, p.state, p.country_full_name].filter(Boolean).join(", "),
    email: p.personal_emails?.[0] || "",
    phone: p.personal_numbers?.[0] || "",
    linkedin: linkedinUrl,
    notes,
    tags: JSON.stringify(tags.slice(0, 6)),
    matchScore: 80,
    status: "sourced",
    lastContact: new Date().toISOString().split("T")[0],
    timeline: JSON.stringify([{ date: new Date().toISOString().split("T")[0], event: "Imported via LinkedIn profile" }]),
    linkedinSnapshot: JSON.stringify({
      title: current?.title,
      company: current?.company,
      location: [p.city, p.state].filter(Boolean).join(", "),
      email: p.personal_emails?.[0] || "",
      phone: p.personal_numbers?.[0] || "",
    }),
    linkedinSyncedAt: new Date().toISOString(),
  };
}

// ─── Register routes ──────────────────────────────────────────────────────────
export function registerCandidateImportRoutes(app: Express) {
  /**
   * POST /api/candidates/import/cv
   * Upload PDF or DOCX → AI-parsed candidate preview
   */
  app.post(
    "/api/candidates/import/cv",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded. Please select a PDF or Word document." });
        }

        const { mimetype, buffer, originalname } = req.file;
        console.log(`[cv-import] Received file: ${originalname}, type: ${mimetype}, size: ${buffer.length} bytes`);

        let text = "";
        if (mimetype === "application/pdf") {
          text = await extractPdfText(buffer);
        } else {
          text = await extractWordText(buffer);
        }

        console.log(`[cv-import] Extracted ${text.length} chars of text`);

        if (!text.trim()) {
          return res.status(422).json({ error: "Could not extract text from the file. The document may be image-based or password protected. Try a different file." });
        }

        const fields = await parseCvWithAI(text);
        console.log(`[cv-import] Parsed candidate: ${fields.name || "(blank)"}`);

        return res.json({
          preview: fields,
          rawTextPreview: text.slice(0, 300),
        });
      } catch (err: any) {
        console.error("[cv-import] Error:", err.message, err.stack);
        return res.status(500).json({ error: err.message || "Upload failed. Please try again." });
      }
    }
  );

  /**
   * POST /api/candidates/import/cv/confirm
   * Save the parsed (and optionally edited) candidate
   */
  app.post("/api/candidates/import/cv/confirm", async (req, res) => {
    try {
      const candidate = req.body as InsertCandidate;
      if (!candidate.name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }
      const saved = await storage.createCandidate(candidate);
      await storage.createActivity({
        type: "note",
        description: `${saved.name} added via CV upload`,
        timestamp: new Date().toISOString(),
        relatedName: saved.name,
      });
      return res.json(saved);
    } catch (err: any) {
      console.error("[cv-confirm]", err.message);
      return res.status(500).json({ error: err.message || "Failed to save candidate" });
    }
  });

  /**
   * POST /api/candidates/import/linkedin
   * Body: { url: "https://linkedin.com/in/..." }
   */
  app.post("/api/candidates/import/linkedin", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.includes("linkedin.com/in/")) {
        return res.status(400).json({ error: "Valid LinkedIn profile URL required (linkedin.com/in/...)" });
      }
      const fields = await fetchLinkedInProfile(url);
      return res.json({ preview: fields });
    } catch (err: any) {
      console.error("[linkedin-import]", err.message);
      return res.status(500).json({ error: err.message || "LinkedIn import failed" });
    }
  });

  /**
   * POST /api/candidates/import/linkedin/confirm
   */
  app.post("/api/candidates/import/linkedin/confirm", async (req, res) => {
    try {
      const candidate = req.body as InsertCandidate;
      if (!candidate.name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }
      const saved = await storage.createCandidate(candidate);
      await storage.createActivity({
        type: "note",
        description: `${saved.name} added via LinkedIn import`,
        timestamp: new Date().toISOString(),
        relatedName: saved.name,
      });
      return res.json(saved);
    } catch (err: any) {
      console.error("[linkedin-confirm]", err.message);
      return res.status(500).json({ error: err.message || "Failed to save candidate" });
    }
  });
}
