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

// ─── Extract text from PDF (pdf-parse v1 — function API) ─────────────────────
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v1 exports a single async function directly
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text || "";
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

// ─── Parse CV text → candidate fields via OpenAI ─────────────────────────────
async function parseCvWithAI(text: string): Promise<Partial<InsertCandidate>> {
  const key = process.env.OPENAI_API_KEY;

  // ── Fallback: no OpenAI key → return blank form with raw text in notes ──
  if (!key) {
    console.warn("[cv-import] No OPENAI_API_KEY — returning blank form for manual fill");
    return {
      name: "",
      title: "",
      company: "",
      location: "",
      email: extractEmail(text),
      phone: extractPhone(text),
      linkedin: extractLinkedIn(text),
      notes: text.slice(0, 1000).trim(),
      tags: JSON.stringify([]),
      matchScore: 75,
      status: "sourced",
      lastContact: new Date().toISOString().split("T")[0],
      timeline: JSON.stringify([{ date: new Date().toISOString().split("T")[0], event: "Imported via CV upload" }]),
    };
  }

  // ── OpenAI parse ──────────────────────────────────────────────────────────
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: key });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a recruitment assistant. Extract candidate information from CV/resume text and return a JSON object with these exact fields:
{
  "name": "Full Name",
  "title": "Current or most recent job title",
  "company": "Current or most recent employer",
  "location": "City, State/Country",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "linkedin": "linkedin URL or empty string",
  "notes": "2-3 sentence professional summary highlighting key achievements and expertise",
  "tags": ["tag1", "tag2", "tag3"]
}
Return ONLY the JSON object, no explanation.`,
      },
      {
        role: "user",
        content: `Extract candidate info from this CV:\n\n${text.slice(0, 8000)}`,
      },
    ],
  });

  let parsed: any = {};
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch {
    parsed = {};
  }

  return {
    name: parsed.name || "",
    title: parsed.title || "",
    company: parsed.company || "",
    location: parsed.location || "",
    email: parsed.email || extractEmail(text),
    phone: parsed.phone || extractPhone(text),
    linkedin: parsed.linkedin || extractLinkedIn(text),
    notes: parsed.notes || "",
    tags: JSON.stringify(Array.isArray(parsed.tags) ? parsed.tags : []),
    matchScore: 75,
    status: "sourced",
    lastContact: new Date().toISOString().split("T")[0],
    timeline: JSON.stringify([{ date: new Date().toISOString().split("T")[0], event: "Imported via CV upload" }]),
  };
}

// ─── Simple regex extractors (used as fallback) ───────────────────────────────
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
          noAiKey: !process.env.OPENAI_API_KEY,
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
