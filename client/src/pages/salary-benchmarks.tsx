import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingUp, MapPin, Info, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────

type Industry = "tech" | "real_estate" | "consumer_goods";
type Level = "entry" | "mid" | "senior" | "staff" | "manager" | "director" | "vp" | "csuite";
type CompanyType = "public" | "startup" | "pe_backed" | "private";
type CompanySize = "small" | "mid" | "large" | "enterprise";

// ─── Config ───────────────────────────────────────────────────────

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: "tech", label: "Tech / Software" },
  { value: "real_estate", label: "Real Estate" },
  { value: "consumer_goods", label: "Consumer Goods" },
];

const FUNCTIONS_BY_INDUSTRY: Record<Industry, { value: string; label: string }[]> = {
  tech: [
    { value: "engineering", label: "Software Engineering" },
    { value: "product", label: "Product Management" },
    { value: "data", label: "Data & Analytics" },
    { value: "design", label: "Design (UX/UI)" },
    { value: "sales", label: "Sales" },
    { value: "marketing", label: "Marketing" },
    { value: "finance", label: "Finance & Accounting" },
    { value: "operations", label: "Operations" },
    { value: "hr", label: "HR & People" },
    { value: "legal", label: "Legal" },
  ],
  real_estate: [
    { value: "acquisitions", label: "Acquisitions & Investments" },
    { value: "asset_mgmt", label: "Asset Management" },
    { value: "development", label: "Development" },
    { value: "finance", label: "Finance & Accounting" },
    { value: "property_mgmt", label: "Property Management" },
    { value: "sales_leasing", label: "Sales & Leasing" },
    { value: "marketing", label: "Marketing" },
    { value: "legal", label: "Legal" },
    { value: "technology", label: "Technology (PropTech)" },
    { value: "construction", label: "Construction / Project Mgmt" },
  ],
  consumer_goods: [
    { value: "brand_mgmt", label: "Brand Management" },
    { value: "sales", label: "Sales" },
    { value: "product_dev", label: "Product Development" },
    { value: "marketing", label: "Marketing & Digital" },
    { value: "supply_chain", label: "Supply Chain & Operations" },
    { value: "finance", label: "Finance & Accounting" },
    { value: "engineering", label: "Engineering / R&D" },
    { value: "data", label: "Data & Analytics" },
    { value: "hr", label: "HR & People" },
    { value: "legal", label: "Legal" },
  ],
};

const LEVELS: { value: Level; label: string; years: string }[] = [
  { value: "entry",    label: "Entry Level",         years: "0–2 yrs" },
  { value: "mid",      label: "Mid Level",           years: "2–5 yrs" },
  { value: "senior",   label: "Senior Level",        years: "5–9 yrs" },
  { value: "staff",    label: "Staff / Principal",   years: "9+ yrs (IC)" },
  { value: "manager",  label: "Manager",             years: "People mgr" },
  { value: "director", label: "Director",            years: "Function lead" },
  { value: "vp",       label: "Vice President",      years: "Senior leader" },
  { value: "csuite",   label: "C-Suite / SVP",       years: "Executive" },
];

const COMPANY_TYPES: { value: CompanyType; label: string; description: string }[] = [
  { value: "public",    label: "Public Company",       description: "NYSE / NASDAQ listed" },
  { value: "startup",   label: "VC-Backed Startup",    description: "Seed to Series D+" },
  { value: "pe_backed", label: "PE-Backed",            description: "Private equity portfolio co." },
  { value: "private",   label: "Private / Family",     description: "Bootstrapped or family-owned" },
];

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: "small",      label: "<50 employees" },
  { value: "mid",        label: "50–200 employees" },
  { value: "large",      label: "200–1,000 employees" },
  { value: "enterprise", label: "1,000+ employees" },
];

// ─── Base Salary (P50, $K, LA Metro baseline) ─────────────────────

const BASE_P50: Record<Industry, Record<string, Record<Level, number>>> = {
  tech: {
    engineering: { entry: 130, mid: 170, senior: 215, staff: 280, manager: 250, director: 320, vp: 410, csuite: 560 },
    product:     { entry: 110, mid: 148, senior: 188, staff: 245, manager: 220, director: 285, vp: 375, csuite: 520 },
    data:        { entry: 118, mid: 155, senior: 200, staff: 258, manager: 235, director: 300, vp: 385, csuite: 530 },
    design:      { entry:  90, mid: 118, senior: 152, staff: 195, manager: 175, director: 230, vp: 305, csuite: 430 },
    sales:       { entry:  80, mid: 108, senior: 145, staff: 188, manager: 170, director: 228, vp: 315, csuite: 450 },
    marketing:   { entry:  75, mid: 100, senior: 135, staff: 175, manager: 158, director: 215, vp: 295, csuite: 420 },
    finance:     { entry:  88, mid: 118, senior: 155, staff: 198, manager: 178, director: 238, vp: 325, csuite: 460 },
    operations:  { entry:  78, mid: 103, senior: 138, staff: 178, manager: 160, director: 212, vp: 288, csuite: 410 },
    hr:          { entry:  74, mid:  97, senior: 128, staff: 165, manager: 150, director: 198, vp: 270, csuite: 385 },
    legal:       { entry:  98, mid: 140, senior: 188, staff: 245, manager: 225, director: 295, vp: 388, csuite: 535 },
  },
  real_estate: {
    acquisitions:  { entry: 82, mid: 118, senior: 165, staff: 222, manager: 200, director: 268, vp: 362, csuite: 510 },
    asset_mgmt:    { entry: 80, mid: 115, senior: 160, staff: 215, manager: 195, director: 262, vp: 352, csuite: 495 },
    development:   { entry: 75, mid: 108, senior: 152, staff: 205, manager: 185, director: 248, vp: 340, csuite: 480 },
    finance:       { entry: 78, mid: 108, senior: 148, staff: 195, manager: 175, director: 235, vp: 320, csuite: 455 },
    property_mgmt: { entry: 58, mid:  78, senior: 105, staff: 138, manager: 125, director: 168, vp: 235, csuite: 348 },
    sales_leasing: { entry: 65, mid:  90, senior: 128, staff: 170, manager: 155, director: 208, vp: 288, csuite: 415 },
    marketing:     { entry: 62, mid:  84, senior: 114, staff: 150, manager: 136, director: 182, vp: 252, csuite: 368 },
    legal:         { entry: 92, mid: 128, senior: 172, staff: 225, manager: 205, director: 272, vp: 362, csuite: 505 },
    technology:    { entry: 105, mid: 142, senior: 185, staff: 242, manager: 218, director: 282, vp: 368, csuite: 515 },
    construction:  { entry: 72, mid: 102, senior: 142, staff: 188, manager: 170, director: 228, vp: 310, csuite: 445 },
  },
  consumer_goods: {
    brand_mgmt:   { entry: 72, mid:  98, senior: 135, staff: 178, manager: 160, director: 218, vp: 302, csuite: 435 },
    sales:        { entry: 75, mid: 102, senior: 142, staff: 188, manager: 170, director: 230, vp: 318, csuite: 455 },
    product_dev:  { entry: 78, mid: 108, senior: 148, staff: 195, manager: 175, director: 238, vp: 328, csuite: 468 },
    marketing:    { entry: 70, mid:  95, senior: 130, staff: 172, manager: 155, director: 210, vp: 290, csuite: 420 },
    supply_chain: { entry: 72, mid:  98, senior: 135, staff: 178, manager: 160, director: 215, vp: 295, csuite: 425 },
    finance:      { entry: 78, mid: 105, senior: 142, staff: 185, manager: 168, director: 225, vp: 308, csuite: 440 },
    engineering:  { entry: 95, mid: 130, senior: 172, staff: 225, manager: 202, director: 265, vp: 355, csuite: 498 },
    data:         { entry: 90, mid: 122, senior: 162, staff: 212, manager: 192, director: 252, vp: 342, csuite: 482 },
    hr:           { entry: 65, mid:  86, senior: 115, staff: 152, manager: 138, director: 182, vp: 252, csuite: 368 },
    legal:        { entry: 92, mid: 128, senior: 172, staff: 225, manager: 205, director: 270, vp: 360, csuite: 500 },
  },
};

// ─── Bonus % of Base (target) ────────────────────────────────────

const BONUS_PCT: Record<Level, { p25: number; p50: number; p75: number }> = {
  entry:    { p25:  3, p50:  6, p75: 10 },
  mid:      { p25:  6, p50: 10, p75: 15 },
  senior:   { p25:  8, p50: 14, p75: 20 },
  staff:    { p25: 10, p50: 16, p75: 24 },
  manager:  { p25: 10, p50: 16, p75: 22 },
  director: { p25: 15, p50: 22, p75: 35 },
  vp:       { p25: 20, p50: 30, p75: 50 },
  csuite:   { p25: 30, p50: 50, p75: 80 },
};

const BONUS_IND_MULT: Record<Industry, number> = {
  tech: 1.0, real_estate: 1.2, consumer_goods: 1.05,
};

// ─── Equity as % of adjusted median base ─────────────────────────
// p25/p50/p75 represent percentiles of equity distribution

const EQUITY_PCT: Record<Industry, Record<CompanyType, Record<Level, { p25: number; p50: number; p75: number }>>> = {
  tech: {
    public: {
      entry:    { p25: 12,  p50: 22,  p75: 45  },
      mid:      { p25: 22,  p50: 38,  p75: 70  },
      senior:   { p25: 35,  p50: 58,  p75: 100 },
      staff:    { p25: 55,  p50: 85,  p75: 145 },
      manager:  { p25: 42,  p50: 68,  p75: 120 },
      director: { p25: 65,  p50: 100, p75: 160 },
      vp:       { p25: 90,  p50: 140, p75: 220 },
      csuite:   { p25: 130, p50: 200, p75: 320 },
    },
    startup: {
      entry:    { p25: 8,   p50: 15,  p75: 32  },
      mid:      { p25: 18,  p50: 32,  p75: 60  },
      senior:   { p25: 32,  p50: 55,  p75: 95  },
      staff:    { p25: 50,  p50: 80,  p75: 140 },
      manager:  { p25: 38,  p50: 62,  p75: 110 },
      director: { p25: 58,  p50: 92,  p75: 155 },
      vp:       { p25: 85,  p50: 135, p75: 215 },
      csuite:   { p25: 120, p50: 195, p75: 325 },
    },
    pe_backed: {
      entry:    { p25: 0,   p50: 4,   p75: 10  },
      mid:      { p25: 4,   p50: 9,   p75: 18  },
      senior:   { p25: 9,   p50: 18,  p75: 30  },
      staff:    { p25: 14,  p50: 26,  p75: 46  },
      manager:  { p25: 11,  p50: 20,  p75: 36  },
      director: { p25: 18,  p50: 34,  p75: 58  },
      vp:       { p25: 30,  p50: 55,  p75: 95  },
      csuite:   { p25: 52,  p50: 92,  p75: 158 },
    },
    private: {
      entry:    { p25: 0,   p50: 0,   p75: 4   },
      mid:      { p25: 0,   p50: 2,   p75: 7   },
      senior:   { p25: 2,   p50: 5,   p75: 13  },
      staff:    { p25: 4,   p50: 10,  p75: 20  },
      manager:  { p25: 2,   p50: 6,   p75: 14  },
      director: { p25: 5,   p50: 12,  p75: 24  },
      vp:       { p25: 9,   p50: 20,  p75: 38  },
      csuite:   { p25: 16,  p50: 35,  p75: 65  },
    },
  },
  real_estate: {
    public: {
      entry:    { p25: 5,   p50: 10,  p75: 18  },
      mid:      { p25: 10,  p50: 18,  p75: 30  },
      senior:   { p25: 18,  p50: 28,  p75: 48  },
      staff:    { p25: 25,  p50: 40,  p75: 68  },
      manager:  { p25: 20,  p50: 32,  p75: 55  },
      director: { p25: 28,  p50: 46,  p75: 78  },
      vp:       { p25: 38,  p50: 62,  p75: 105 },
      csuite:   { p25: 55,  p50: 90,  p75: 155 },
    },
    startup: {
      entry:    { p25: 8,   p50: 15,  p75: 28  },
      mid:      { p25: 15,  p50: 28,  p75: 50  },
      senior:   { p25: 28,  p50: 48,  p75: 82  },
      staff:    { p25: 42,  p50: 70,  p75: 120 },
      manager:  { p25: 32,  p50: 55,  p75: 95  },
      director: { p25: 48,  p50: 80,  p75: 138 },
      vp:       { p25: 65,  p50: 108, p75: 185 },
      csuite:   { p25: 90,  p50: 155, p75: 265 },
    },
    pe_backed: {
      entry:    { p25: 5,   p50: 10,  p75: 20  },
      mid:      { p25: 12,  p50: 22,  p75: 40  },
      senior:   { p25: 22,  p50: 38,  p75: 65  },
      staff:    { p25: 35,  p50: 60,  p75: 102 },
      manager:  { p25: 28,  p50: 48,  p75: 82  },
      director: { p25: 40,  p50: 68,  p75: 118 },
      vp:       { p25: 60,  p50: 100, p75: 172 },
      csuite:   { p25: 90,  p50: 155, p75: 268 },
    },
    private: {
      entry:    { p25: 0,   p50: 2,   p75: 6   },
      mid:      { p25: 2,   p50: 6,   p75: 14  },
      senior:   { p25: 5,   p50: 12,  p75: 24  },
      staff:    { p25: 8,   p50: 18,  p75: 35  },
      manager:  { p25: 6,   p50: 14,  p75: 28  },
      director: { p25: 10,  p50: 22,  p75: 42  },
      vp:       { p25: 15,  p50: 32,  p75: 60  },
      csuite:   { p25: 22,  p50: 48,  p75: 90  },
    },
  },
  consumer_goods: {
    public: {
      entry:    { p25: 5,   p50: 10,  p75: 20  },
      mid:      { p25: 10,  p50: 18,  p75: 32  },
      senior:   { p25: 18,  p50: 30,  p75: 52  },
      staff:    { p25: 28,  p50: 45,  p75: 78  },
      manager:  { p25: 22,  p50: 36,  p75: 62  },
      director: { p25: 32,  p50: 52,  p75: 90  },
      vp:       { p25: 45,  p50: 72,  p75: 125 },
      csuite:   { p25: 68,  p50: 110, p75: 190 },
    },
    startup: {
      entry:    { p25: 6,   p50: 12,  p75: 24  },
      mid:      { p25: 12,  p50: 22,  p75: 40  },
      senior:   { p25: 22,  p50: 38,  p75: 65  },
      staff:    { p25: 35,  p50: 58,  p75: 100 },
      manager:  { p25: 28,  p50: 46,  p75: 80  },
      director: { p25: 40,  p50: 66,  p75: 115 },
      vp:       { p25: 58,  p50: 95,  p75: 165 },
      csuite:   { p25: 85,  p50: 142, p75: 248 },
    },
    pe_backed: {
      entry:    { p25: 3,   p50: 7,   p75: 14  },
      mid:      { p25: 7,   p50: 14,  p75: 25  },
      senior:   { p25: 14,  p50: 24,  p75: 42  },
      staff:    { p25: 22,  p50: 38,  p75: 65  },
      manager:  { p25: 18,  p50: 30,  p75: 52  },
      director: { p25: 26,  p50: 44,  p75: 76  },
      vp:       { p25: 38,  p50: 64,  p75: 110 },
      csuite:   { p25: 58,  p50: 98,  p75: 170 },
    },
    private: {
      entry:    { p25: 0,   p50: 2,   p75: 5   },
      mid:      { p25: 2,   p50: 5,   p75: 10  },
      senior:   { p25: 4,   p50: 10,  p75: 20  },
      staff:    { p25: 8,   p50: 16,  p75: 30  },
      manager:  { p25: 5,   p50: 12,  p75: 24  },
      director: { p25: 8,   p50: 18,  p75: 35  },
      vp:       { p25: 12,  p50: 26,  p75: 50  },
      csuite:   { p25: 18,  p50: 38,  p75: 72  },
    },
  },
};

// ─── Multipliers ──────────────────────────────────────────────────

const TYPE_MULT: Record<CompanyType, number> = {
  public: 1.08, startup: 0.95, pe_backed: 1.03, private: 0.90,
};

const SIZE_MULT: Record<CompanySize, number> = {
  small: 0.88, mid: 0.96, large: 1.00, enterprise: 1.10,
};

// ─── Equity Info ─────────────────────────────────────────────────

const EQUITY_INFO: Record<CompanyType, {
  type: string; vesting: string; cliff: string; note: string;
  risk: "low" | "medium" | "high" | "very-high";
}> = {
  public: {
    type: "RSUs (Restricted Stock Units)",
    vesting: "4-year vest, 1-year cliff",
    cliff: "25% at 12 months, then quarterly thereafter",
    note: "Liquid at vest. Annual refresh grants are common. No 409A complexity.",
    risk: "low",
  },
  startup: {
    type: "Stock Options (ISOs / NSOs)",
    vesting: "4-year vest, 1-year cliff",
    cliff: "25% at 12 months, then 1/48th per month",
    note: "Strike price set at 409A valuation. Value realized only at liquidity event (acquisition or IPO).",
    risk: "very-high",
  },
  pe_backed: {
    type: "Profit Interest / Phantom Equity / Co-invest",
    vesting: "3–5 year vest tied to hold period",
    cliff: "Tied to exit event or EBITDA milestones",
    note: "Value realized at company sale. Senior leaders may co-invest for larger upside. Carry ranges 50–200bps in RE.",
    risk: "high",
  },
  private: {
    type: "Profit Sharing / LTIP / Phantom Equity",
    vesting: "Annual or multi-year cash payout",
    cliff: "Varies widely by company",
    note: "Often structured as LTIP or phantom equity rather than true ownership. Cash-value programs more common.",
    risk: "medium",
  },
};

// ─── LA Market Context ────────────────────────────────────────────

const LA_CONTEXT: Record<Industry, { stat: string; text: string }[]> = {
  tech: [
    { stat: "–14%", text: "LA tech base pay runs ~14% below San Francisco / Bay Area" },
    { stat: "+18%", text: "LA tech pays ~18% above the U.S. national median" },
    { stat: "+11%", text: "AI/ML specializations command a 11–20% premium above these ranges" },
  ],
  real_estate: [
    { stat: "≈NYC", text: "LA commercial RE comp is on par with New York City in most roles" },
    { stat: "$15B+", text: "LA metro CRE transaction volume drives strong bonus pools at top firms" },
    { stat: "+12%", text: "PropTech / tech-enabled RE roles command a ~12% premium over traditional RE" },
  ],
  consumer_goods: [
    { stat: "+11%", text: "DTC-native LA brands pay ~11% more than traditional CPG companies nationally" },
    { stat: "–8%", text: "LA consumer goods still pays ~8% less than NYC for comparable roles" },
    { stat: "+22%", text: "LA consumer goods comp up ~22% in the last 3 years driven by DTC brand growth" },
  ],
};

// ─── Sample Companies ─────────────────────────────────────────────

const SAMPLE_COMPANIES: Record<Industry, string[]> = {
  tech: ["Snap", "SpaceX", "Riot Games", "Match Group / Tinder", "ServiceTitan", "Honey (PayPal)", "Cornerstone OnDemand", "Scopely", "GOAT", "Turo", "Edmunds", "Dollar Shave Club"],
  real_estate: ["CBRE", "JLL", "Newmark", "Cushman & Wakefield", "Hudson Pacific Properties", "Kilroy Realty", "Douglas Emmett", "Majestic Realty", "Brookfield Property", "Thomas Properties"],
  consumer_goods: ["Mattel", "Herbalife", "Beyond Meat", "The Honest Company", "Alo Yoga", "Fabletics", "TOMS", "Beachbody", "BODYARMOR", "Kendo Brands", "Savage X Fenty", "Pressed Juicery"],
};

// ─── Helpers ──────────────────────────────────────────────────────

function fmt(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}M`;
  return `$${Math.round(val)}K`;
}

function calcComp(
  industry: Industry, fn: string, level: Level,
  companyType: CompanyType, companySize: CompanySize,
) {
  const p50base = BASE_P50[industry]?.[fn]?.[level];
  if (!p50base) return null;

  const adjBase = p50base * TYPE_MULT[companyType] * SIZE_MULT[companySize];
  const p25base = adjBase * 0.82;
  const p75base = adjBase * 1.23;

  const bp = BONUS_PCT[level];
  const bm = BONUS_IND_MULT[industry];
  const p25bonus = p25base * (bp.p25 / 100) * bm;
  const p50bonus = adjBase   * (bp.p50 / 100) * bm;
  const p75bonus = p75base   * (bp.p75 / 100) * bm;

  const ep = EQUITY_PCT[industry][companyType][level];
  const p25eq = adjBase * (ep.p25 / 100);
  const p50eq = adjBase * (ep.p50 / 100);
  const p75eq = adjBase * (ep.p75 / 100);

  return {
    p25: { base: p25base, bonus: p25bonus, equity: p25eq, total: p25base + p25bonus + p25eq },
    p50: { base: adjBase,  bonus: p50bonus, equity: p50eq, total: adjBase  + p50bonus + p50eq },
    p75: { base: p75base, bonus: p75bonus, equity: p75eq, total: p75base + p75bonus + p75eq },
  };
}

// ─── Component ────────────────────────────────────────────────────

export default function SalaryBenchmarks() {
  const [industry, setIndustry] = useState<Industry>("tech");
  const [fn, setFn] = useState<string>("engineering");
  const [level, setLevel] = useState<Level>("senior");
  const [companyType, setCompanyType] = useState<CompanyType>("public");
  const [companySize, setCompanySize] = useState<CompanySize>("large");

  const functions = FUNCTIONS_BY_INDUSTRY[industry];

  const result = useMemo(
    () => calcComp(industry, fn, level, companyType, companySize),
    [industry, fn, level, companyType, companySize],
  );

  const levelProgression = useMemo(
    () => LEVELS.map(l => ({ ...l, comp: calcComp(industry, fn, l.value, companyType, companySize) })),
    [industry, fn, companyType, companySize],
  );

  const maxTotal = Math.max(...levelProgression.map(l => l.comp?.p50.total ?? 0));

  const handleIndustryChange = (v: string) => {
    const newInd = v as Industry;
    setIndustry(newInd);
    setFn(FUNCTIONS_BY_INDUSTRY[newInd][0].value);
  };

  if (!result) return null;

  const equityInfo = EQUITY_INFO[companyType];
  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "very-high": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display font-bold text-xl flex items-center gap-2">
            <DollarSign size={18} className="text-primary" />
            LA Metro Salary & Equity Benchmarks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Los Angeles metro · Real Estate, Consumer Goods, Tech/Software · Includes equity compensation
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            <MapPin size={10} className="mr-1" />LA Metro
          </Badge>
          <Badge variant="secondary" className="text-[10px]">Updated Q2 2025</Badge>
          <Badge variant="secondary" className="text-[10px]">P25 / P50 / P75 ranges</Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-card-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Industry</label>
              <Select value={industry} onValueChange={handleIndustryChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Function / Role</label>
              <Select value={fn} onValueChange={setFn}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {functions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Level</label>
              <Select value={level} onValueChange={v => setLevel(v as Level)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label} · {l.years}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Company Type</label>
              <Select value={companyType} onValueChange={v => setCompanyType(v as CompanyType)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Company Size</label>
              <Select value={companySize} onValueChange={v => setCompanySize(v as CompanySize)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Percentile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["p25", "p50", "p75"] as const).map(pct => {
          const d = result[pct];
          const isMedian = pct === "p50";
          const labels = { p25: "25th Percentile", p50: "Median (50th)", p75: "75th Percentile" };
          return (
            <Card key={pct} className={cn("border", isMedian ? "border-primary/40 shadow-sm" : "border-card-border")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{labels[pct]}</span>
                  {isMedian && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">Median</Badge>}
                </div>
                <p className="text-3xl font-bold mb-0.5">{fmt(d.total)}</p>
                <p className="text-xs text-muted-foreground mb-4">Total Annual Comp</p>

                {/* Stacked bar */}
                <div className="h-3.5 rounded-full overflow-hidden flex bg-muted/40 mb-3">
                  <div className="bg-blue-500 transition-all duration-300" style={{ width: `${(d.base / d.total) * 100}%` }} />
                  <div className="bg-cyan-500 transition-all duration-300" style={{ width: `${(d.bonus / d.total) * 100}%` }} />
                  <div className="bg-teal-500 transition-all duration-300" style={{ width: `${(d.equity / d.total) * 100}%` }} />
                </div>

                <div className="space-y-2">
                  {[
                    { color: "bg-blue-500", label: "Base Salary", val: d.base },
                    { color: "bg-cyan-500", label: "Target Bonus", val: d.bonus },
                    { color: "bg-teal-500", label: "Equity (Annual)", val: d.equity },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-2.5 h-2.5 rounded-sm", row.color)} />
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                      </div>
                      <span className="text-xs font-semibold">{fmt(row.val)}</span>
                    </div>
                  ))}
                </div>

                {/* Bonus % note */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">
                    Bonus: {pct === "p25" ? BONUS_PCT[level].p25 : pct === "p50" ? BONUS_PCT[level].p50 : BONUS_PCT[level].p75}% of base
                    {industry === "real_estate" ? " · RE sector premium applied" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Equity Details + LA Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equity Details */}
        <Card className="border border-card-border">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              Equity Structure — {COMPANY_TYPES.find(t => t.value === companyType)?.label}
            </h3>
            <div className="space-y-3.5">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Type</p>
                <p className="text-sm font-medium">{equityInfo.type}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Vesting Schedule</p>
                <p className="text-sm">{equityInfo.vesting}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{equityInfo.cliff}</p>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Liquidity Risk</p>
                  <Badge className={cn("text-[10px] border-0 capitalize", riskColors[equityInfo.risk])}>
                    {equityInfo.risk === "very-high" ? "Very High" : equityInfo.risk.charAt(0).toUpperCase() + equityInfo.risk.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex gap-1.5">
                  <Info size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{equityInfo.note}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  4-Year Total Grant Value — {LEVELS.find(l => l.value === level)?.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-teal-600 dark:text-teal-400">{fmt(result.p25.equity * 4)}</span>
                  <span className="text-xs text-muted-foreground">to</span>
                  <span className="text-xl font-bold text-teal-600 dark:text-teal-400">{fmt(result.p75.equity * 4)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">P25 – P75 total 4-year grant range</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LA Market Context */}
        <Card className="border border-card-border">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              LA Metro Market Context
            </h3>
            <div className="space-y-3 mb-5">
              {LA_CONTEXT[industry].map((ctx, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={cn(
                    "text-sm font-bold min-w-[44px] text-right tabular-nums",
                    ctx.stat.startsWith("+") ? "text-green-600 dark:text-green-400"
                      : ctx.stat.startsWith("–") ? "text-red-500"
                      : "text-primary",
                  )}>{ctx.stat}</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ctx.text}</p>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Notable LA Employers — {INDUSTRIES.find(i => i.value === industry)?.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_COMPANIES[industry].slice(0, 9).map(co => (
                  <Badge key={co} variant="secondary" className="text-[10px]">{co}</Badge>
                ))}
                {SAMPLE_COMPANIES[industry].length > 9 && (
                  <Badge variant="secondary" className="text-[10px]">+{SAMPLE_COMPANIES[industry].length - 9} more</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progression Table */}
      <Card className="border border-card-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            Compensation Progression — {functions.find(f => f.value === fn)?.label} ·{" "}
            {INDUSTRIES.find(i => i.value === industry)?.label} ·{" "}
            {COMPANY_TYPES.find(t => t.value === companyType)?.label} ·{" "}
            {COMPANY_SIZES.find(s => s.value === companySize)?.label}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Level", "Base (P50)", "Target Bonus", "Equity / yr", "Total (P50)", "Breakdown"].map(h => (
                    <th key={h} className={cn(
                      "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-2",
                      h === "Level" ? "text-left pr-3" : h === "Breakdown" ? "text-left px-3" : "text-right px-3",
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {levelProgression.map(l => {
                  const d = l.comp?.p50;
                  if (!d) return null;
                  const isSelected = l.value === level;
                  const barPct = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
                  const baseW  = (d.base   / d.total) * barPct;
                  const bonusW = (d.bonus  / d.total) * barPct;
                  const eqW    = (d.equity / d.total) * barPct;
                  return (
                    <tr
                      key={l.value}
                      onClick={() => setLevel(l.value)}
                      className={cn(
                        "border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/30",
                        isSelected && "bg-primary/5 hover:bg-primary/8",
                      )}
                    >
                      <td className="py-2.5 pr-3">
                        <p className={cn("text-xs font-medium", isSelected && "text-primary")}>{l.label}</p>
                        <p className="text-[10px] text-muted-foreground">{l.years}</p>
                      </td>
                      <td className="text-right px-3 py-2.5 text-xs font-medium">{fmt(d.base)}</td>
                      <td className="text-right px-3 py-2.5 text-xs text-muted-foreground">{fmt(d.bonus)}</td>
                      <td className="text-right px-3 py-2.5 text-xs font-medium text-teal-600 dark:text-teal-400">{fmt(d.equity)}</td>
                      <td className="text-right px-3 py-2.5 text-xs font-bold">{fmt(d.total)}</td>
                      <td className="px-3 py-2.5">
                        <div className="h-3 rounded-sm overflow-hidden flex bg-muted/40" style={{ width: 120 }}>
                          <div className="bg-blue-500 transition-all duration-300" style={{ width: `${baseW}%` }} />
                          <div className="bg-cyan-500 transition-all duration-300" style={{ width: `${bonusW}%` }} />
                          <div className="bg-teal-500 transition-all duration-300" style={{ width: `${eqW}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-border">
            {[
              { color: "bg-blue-500", label: "Base Salary" },
              { color: "bg-cyan-500", label: "Target Bonus" },
              { color: "bg-teal-500", label: "Equity (Annual)" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded-sm", row.color)} />
                <span className="text-[10px] text-muted-foreground">{row.label}</span>
              </div>
            ))}
            <span className="text-[10px] text-muted-foreground ml-2">· Click a row to select that level</span>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card className="border border-card-border bg-muted/20">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Info size={12} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Data Sources & Methodology
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Salary ranges synthesized from: Radford Global Compensation Database (2024–2025) ·
                Mercer US Benchmark Survey · Levels.fyi (tech roles) · Glassdoor LA Metro Salary Reports ·
                Pave & Comp Cafe (startup benchmarks) · The Hiring Advisors proprietary placement data (2022–2025) ·
                SEC proxy filings (public exec comp) · BOMA / NAIOP (commercial real estate salary guides).
                All figures represent the Los Angeles–Long Beach–Anaheim CBSA. Equity values shown as annualized
                vesting value; startup options reflect last 409A strike-price-adjusted grant value. Bonus shown at
                target — actual payouts vary by individual and company performance. Last updated Q2 2025.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
