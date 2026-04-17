/**
 * candidate-import.ts
 * ─────────────────────────────────────────────────────────
 * Two ToS-compliant candidate import flows:
 *
 * 1. CV / Resume Upload  — PDF or DOCX → text extraction → OpenAI parse
 * 2. LinkedIn Import     — LinkedIn profile URL → ProxyCurl API → structured data
 *
 * Neither flow scrapes LinkedIn directly. ProxyCurl is a licensed
 * data provider that operates within LinkedIn's permitted use policy.
 */

import { type Express, type Request, type Response } from "express";
import multer from "multer";
import OpenAI from "openai";
import { storage } from "./storage";
import type { InsertCandidate } from "@shared/schema";

// ─── Multer (in-memory, max 10MB) ────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.mimetype);
    cb(null, ok);
  },
});

// ─── OpenAI client (lazy — only if key present) ───────────────────────────────
function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey: key });
}

// ─── Extract text from PDF ────────────────────────────────────────────────────
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

// ─── Extract text from DOCX / DOC ────────────────────────────────────────────
async function extractWordText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ─── Parse CV text → candidate fields via OpenAI ─────────────────────────────
async function parseCvWithAI(text: string): Promise<Partial<InsertCandidate>> {
  const openai = getOpenAI();

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
  "tags": ["tag1", "tag2", "tag3"]  // 3-5 relevant tags like industry, function, skills
}
Return ONLY the JSON object, no explanation.`,
      },
      {
        role: "user",
        content: `Extract candidate info from this CV:\n\n${text.slice(0, 8000)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  return {
    name: parsed.name || "Unknown",
    title: parsed.title || "",
    company: parsed.company || "",
    location: parsed.location || "",
    email: parsed.email || "",
    phone: parsed.phone || "",
    linkedin: parsed.linkedin || "",
    notes: parsed.notes || "",
    tags: JSON.stringify(Array.isArray(parsed.tags) ? parsed.tags : []),
    matchScore: 75, // default score for imported candidates
    status: "sourced",
    lastContact: new Date().toISOString().split("T")[0],
    timeline: JSON.stringify([
      {
        date: new Date().toISOString().split("T")[0],
        event: "Imported via CV upload",
      },
    ]),
  };
}

// ─── Fetch LinkedIn profile via ProxyCurl ─────────────────────────────────────
async function fetchLinkedInProfile(
  linkedinUrl: string
): Promise<Partial<InsertCandidate>> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) throw new Error("PROXYCURL_API_KEY not configured");

  const encoded = encodeURIComponent(linkedinUrl);
  const resp = await fetch(
    `https://nubela.co/proxycurl/api/v2/linkedin?url=${encoded}&skills=include&extra=include`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ProxyCurl error ${resp.status}: ${err}`);
  }

  const p = await resp.json() as any;

  // Build tags from skills + industry
  const tags: string[] = [];
  if (p.industry) tags.push(p.industry);
  if (Array.isArray(p.skills)) tags.push(...p.skills.slice(0, 4));

  // Most recent position
  const experience = Array.isArray(p.experiences) ? p.experiences : [];
  const current = experience[0];

  // Build notes from summary + headline
  const notes = [p.summary, p.headline]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 500) || `LinkedIn profile for ${p.full_name}`;

  return {
    name: p.full_name || "",
    title: current?.title || p.headline || "",
    company: current?.company || "",
    location: [p.city, p.state, p.country_full_name]
      .filter(Boolean)
      .join(", "),
    email: p.personal_emails?.[0] || "",
    phone: p.personal_numbers?.[0] || "",
    linkedin: linkedinUrl,
    notes,
    tags: JSON.stringify(tags.slice(0, 6)),
    matchScore: 80,
    status: "sourced",
    lastContact: new Date().toISOString().split("T")[0],
    timeline: JSON.stringify([
      {
        date: new Date().toISOString().split("T")[0],
        event: "Imported via LinkedIn profile",
      },
    ]),
    // Store full LinkedIn snapshot for future sync
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
   * Upload a PDF or DOCX resume → AI-parsed candidate
   */
  app.post(
    "/api/candidates/import/cv",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const { mimetype, buffer } = req.file;
        let text = "";

        if (mimetype === "application/pdf") {
          text = await extractPdfText(buffer);
        } else {
          text = await extractWordText(buffer);
        }

        if (!text.trim()) {
          return res.status(422).json({ error: "Could not extract text from file" });
        }

        // Parse with AI
        const fields = await parseCvWithAI(text);

        // Return preview — don't save yet, let user confirm
        return res.json({ preview: fields, rawText: text.slice(0, 500) });
      } catch (err: any) {
        console.error("[cv-import]", err.message);
        return res.status(500).json({ error: err.message });
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
      if (!candidate.name) {
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
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/candidates/import/linkedin
   * Body: { url: "https://linkedin.com/in/..." }
   * Fetches via ProxyCurl, returns preview
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
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/candidates/import/linkedin/confirm
   * Save the previewed LinkedIn candidate
   */
  app.post("/api/candidates/import/linkedin/confirm", async (req, res) => {
    try {
      const candidate = req.body as InsertCandidate;
      if (!candidate.name) {
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
      return res.status(500).json({ error: err.message });
    }
  });
}
