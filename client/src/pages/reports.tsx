import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  Trophy,
  Users,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  GripVertical,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Shared tooltip style ─────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "6px",
    fontSize: "12px",
  },
};

const periods = ["This Week", "This Month", "This Quarter", "This Year"];

// ─── Types ────────────────────────────────────────────────────────────────────
type Health = "Stalled" | "At Risk" | "Healthy";
type Urgency = "urgent" | "action" | "monitor";
type ClientStatus = "Active" | "At Risk";

interface SearchRow {
  id: number;
  client: string;
  title: string;
  health: Health;
  daysOpen: number;
  candidates: number;
  owner: string;
}

interface PriorityAction {
  id: number;
  urgency: Urgency;
  text: string;
  search: string;
  done: boolean;
}

interface ClientRow {
  id: number;
  client: string;
  pe: string;
  searches: number;
  submitted: number;
  interviews: number;
  status: ClientStatus;
  lastActivity: string;
}

interface RecruiterRow {
  id: number;
  name: string;
  searches: number;
  submitted: number;
  interviews: number;
  placements: number;
  avgDays: number | null;
  fillRate: number | null;
}

// ─── Initial data ─────────────────────────────────────────────────────────────
const INIT_SEARCHES: SearchRow[] = [
  { id: 1, client: "Meridian Capital", title: "Chief Financial Officer", health: "Stalled", daysOpen: 52, candidates: 3, owner: "A" },
  { id: 2, client: "Summit Ventures", title: "Chief Technology Officer", health: "Stalled", daysOpen: 41, candidates: 5, owner: "R" },
  { id: 3, client: "Harborview PE", title: "VP Operations", health: "Stalled", daysOpen: 38, candidates: 2, owner: "A" },
  { id: 4, client: "CarePoint Health", title: "Chief Operating Officer", health: "At Risk", daysOpen: 29, candidates: 7, owner: "R" },
  { id: 5, client: "TalentForge", title: "VP Sales", health: "At Risk", daysOpen: 22, candidates: 9, owner: "A" },
  { id: 6, client: "Westfield Capital", title: "General Counsel", health: "At Risk", daysOpen: 18, candidates: 4, owner: "Ai" },
  { id: 7, client: "DataPulse", title: "Chief Technology Officer", health: "Healthy", daysOpen: 14, candidates: 11, owner: "R" },
  { id: 8, client: "Elevate Partners", title: "Chief Marketing Officer", health: "Healthy", daysOpen: 11, candidates: 8, owner: "A" },
  { id: 9, client: "Riviera Health", title: "Chief Revenue Officer", health: "Healthy", daysOpen: 9, candidates: 6, owner: "Ai" },
  { id: 10, client: "NorthStar Equity", title: "Head of Finance", health: "Healthy", daysOpen: 7, candidates: 5, owner: "R" },
  { id: 11, client: "Polaris Group", title: "Chief People Officer", health: "Healthy", daysOpen: 5, candidates: 3, owner: "A" },
];

const INIT_ACTIONS: PriorityAction[] = [
  { id: 1, urgency: "urgent", text: "Meridian CFO — 0 candidate movement in 12 days. Send status update to Warburg Pincus contact.", search: "Meridian Capital · CFO", done: false },
  { id: 2, urgency: "urgent", text: "Summit CTO — Client hasn't responded to shortlist sent 9 days ago. Follow up today.", search: "Summit Ventures · CTO", done: false },
  { id: 3, urgency: "action", text: "CarePoint COO — Interview feedback from client overdue 3 days.", search: "CarePoint Health · COO", done: false },
  { id: 4, urgency: "action", text: "TalentForge VP Sales — Present 2 new candidates sourced this week.", search: "TalentForge · VP Sales", done: false },
  { id: 5, urgency: "monitor", text: "DataPulse CTO — Sarah Chen 2nd round scheduled. Confirm prep call.", search: "DataPulse · CTO", done: false },
];

const INIT_CLIENTS: ClientRow[] = [
  { id: 1, client: "Meridian Capital", pe: "Warburg Pincus", searches: 2, submitted: 18, interviews: 9, status: "At Risk", lastActivity: "12 days ago" },
  { id: 2, client: "Summit Ventures", pe: "Summit Partners", searches: 1, submitted: 12, interviews: 6, status: "At Risk", lastActivity: "9 days ago" },
  { id: 3, client: "CarePoint Health", pe: "Blackstone", searches: 1, submitted: 15, interviews: 7, status: "Active", lastActivity: "3 days ago" },
  { id: 4, client: "DataPulse", pe: "General Atlantic", searches: 1, submitted: 14, interviews: 8, status: "Active", lastActivity: "Today" },
  { id: 5, client: "TalentForge", pe: "KKR", searches: 1, submitted: 11, interviews: 5, status: "Active", lastActivity: "2 days ago" },
  { id: 6, client: "Elevate Partners", pe: "Bain Capital", searches: 1, submitted: 10, interviews: 4, status: "Active", lastActivity: "Yesterday" },
  { id: 7, client: "Riviera Health", pe: "Apollo", searches: 2, submitted: 16, interviews: 8, status: "Active", lastActivity: "Today" },
  { id: 8, client: "NorthStar Equity", pe: "TPG", searches: 2, submitted: 22, interviews: 11, status: "Active", lastActivity: "Yesterday" },
];

const INIT_RECRUITERS: RecruiterRow[] = [
  { id: 1, name: "Andrew", searches: 5, submitted: 34, interviews: 18, placements: 2, avgDays: 35, fillRate: 72 },
  { id: 2, name: "Ryan", searches: 4, submitted: 28, interviews: 14, placements: 1, avgDays: 41, fillRate: 58 },
  { id: 3, name: "Aileen", searches: 2, submitted: 19, interviews: 8, placements: 0, avgDays: null, fillRate: null },
];

// ─── Static chart data (unchanged) ───────────────────────────────────────────
const conversionFunnel = [
  { stage: "Sourced → Contacted", pct: 72, fill: "hsl(217, 91%, 60%)" },
  { stage: "Contacted → Screening", pct: 48, fill: "hsl(199, 89%, 48%)" },
  { stage: "Screening → Interview", pct: 61, fill: "hsl(168, 76%, 42%)" },
  { stage: "Interview → Offer", pct: 38, fill: "hsl(43, 96%, 50%)" },
  { stage: "Offer → Placed", pct: 82, fill: "hsl(142, 71%, 45%)" },
];
const stageTime = [
  { stage: "Sourcing", days: 8, fill: "hsl(217, 91%, 60%)" },
  { stage: "Screening", days: 12, fill: "hsl(199, 89%, 48%)" },
  { stage: "Interview", days: 18, fill: "hsl(14, 89%, 58%)" },
  { stage: "Offer", days: 6, fill: "hsl(142, 71%, 45%)" },
];
const velocityTrend = [
  { month: "Aug", days: 51 }, { month: "Sep", days: 47 }, { month: "Oct", days: 44 },
  { month: "Nov", days: 41 }, { month: "Dec", days: 39 }, { month: "Jan", days: 38 },
];
const activityBreakdown = [
  { name: "Andrew", calls: 32, emails: 87, submittals: 34 },
  { name: "Ryan", calls: 26, emails: 71, submittals: 28 },
  { name: "Aileen", calls: 18, emails: 54, submittals: 19 },
];
const busiestDays = [
  { day: "Mon", activities: 42 }, { day: "Tue", activities: 58 }, { day: "Wed", activities: 61 },
  { day: "Thu", activities: 53 }, { day: "Fri", activities: 37 },
];
const clientRevenue = [
  { client: "NorthStar Equity", value: 480000, fill: "hsl(217, 91%, 60%)" },
  { client: "Riviera Health", value: 420000, fill: "hsl(199, 89%, 48%)" },
  { client: "Meridian Capital", value: 380000, fill: "hsl(168, 76%, 42%)" },
  { client: "CarePoint Health", value: 310000, fill: "hsl(43, 96%, 50%)" },
  { client: "DataPulse", value: 290000, fill: "hsl(262, 83%, 58%)" },
  { client: "TalentForge", value: 240000, fill: "hsl(142, 71%, 45%)" },
  { client: "Elevate Partners", value: 210000, fill: "hsl(14, 89%, 58%)" },
  { client: "Summit Ventures", value: 185000, fill: "hsl(291, 60%, 52%)" },
];
const placementsByMonth = [
  { month: "Feb", placements: 2 }, { month: "Mar", placements: 3 }, { month: "Apr", placements: 2 },
  { month: "May", placements: 4 }, { month: "Jun", placements: 3 }, { month: "Jul", placements: 5 },
  { month: "Aug", placements: 3 }, { month: "Sep", placements: 4 }, { month: "Oct", placements: 3 },
  { month: "Nov", placements: 5 }, { month: "Dec", placements: 4 }, { month: "Jan", placements: 3 },
];
const revenueArea = [
  { month: "Aug", realized: 185000, pipeline: 620000 }, { month: "Sep", realized: 240000, pipeline: 710000 },
  { month: "Oct", realized: 195000, pipeline: 780000 }, { month: "Nov", realized: 310000, pipeline: 850000 },
  { month: "Dec", realized: 280000, pipeline: 920000 }, { month: "Jan", realized: 215000, pipeline: 2400000 },
];
const placementByFunction = [
  { name: "CFO", value: 30, fill: "hsl(217, 91%, 60%)" }, { name: "CTO", value: 20, fill: "hsl(199, 89%, 48%)" },
  { name: "COO", value: 15, fill: "hsl(168, 76%, 42%)" }, { name: "CMO", value: 10, fill: "hsl(43, 96%, 50%)" },
  { name: "VP Sales", value: 10, fill: "hsl(262, 83%, 58%)" }, { name: "Other", value: 15, fill: "hsl(142, 71%, 45%)" },
];
const placementSource = [
  { source: "LinkedIn", pct: 35, fill: "hsl(217, 91%, 60%)" }, { source: "Referral", pct: 28, fill: "hsl(199, 89%, 48%)" },
  { source: "Database", pct: 22, fill: "hsl(168, 76%, 42%)" }, { source: "Conference", pct: 10, fill: "hsl(43, 96%, 50%)" },
  { source: "Other", pct: 5, fill: "hsl(142, 71%, 45%)" },
];
const timeToFillTrend = [
  { month: "Aug", days: 51 }, { month: "Sep", days: 47 }, { month: "Oct", days: 44 },
  { month: "Nov", days: 41 }, { month: "Dec", days: 39 }, { month: "Jan", days: 38 },
];

// ─── Health cycle ─────────────────────────────────────────────────────────────
const HEALTH_CYCLE: Health[] = ["Healthy", "At Risk", "Stalled"];
const URGENCY_CYCLE: Urgency[] = ["urgent", "action", "monitor"];
const CLIENT_STATUS_CYCLE: ClientStatus[] = ["Active", "At Risk"];

// ─── Inline editable cell ─────────────────────────────────────────────────────
function EditableCell({
  value,
  onSave,
  numeric = false,
  className = "",
}: {
  value: string | number;
  onSave: (v: string) => void;
  numeric?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  function commit() {
    setEditing(false);
    onSave(draft);
  }
  function cancel() {
    setEditing(false);
    setDraft(String(value));
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={draft}
          type={numeric ? "number" : "text"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
          className="h-6 text-xs px-1.5 w-full min-w-0"
        />
        <button onClick={commit} className="text-green-600 hover:text-green-700 flex-shrink-0"><Check size={12} /></button>
        <button onClick={cancel} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X size={12} /></button>
      </div>
    );
  }

  return (
    <span
      className={cn("group cursor-pointer hover:text-primary flex items-center gap-1 min-w-0", className)}
      onClick={startEdit}
      title="Click to edit"
    >
      <span className="truncate">{value}</span>
      <Pencil size={10} className="opacity-0 group-hover:opacity-60 flex-shrink-0 transition-opacity" />
    </span>
  );
}

// ─── Health badge (click to cycle) ───────────────────────────────────────────
function HealthBadge({ health, onClick }: { health: Health; onClick?: () => void }) {
  const base = "inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5 cursor-pointer select-none transition-opacity hover:opacity-80";
  if (health === "Healthy")
    return <span className={cn(base, "bg-green-100 text-green-700")} onClick={onClick}><CheckCircle2 size={10} />Healthy</span>;
  if (health === "At Risk")
    return <span className={cn(base, "bg-amber-100 text-amber-700")} onClick={onClick}><AlertTriangle size={10} />At Risk</span>;
  return <span className={cn(base, "bg-red-100 text-red-700")} onClick={onClick}><AlertCircle size={10} />Stalled</span>;
}

function UrgencyBadge({ urgency, onClick }: { urgency: Urgency; onClick?: () => void }) {
  const base = "inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5 cursor-pointer select-none transition-opacity hover:opacity-80";
  if (urgency === "urgent") return <span className={cn(base, "bg-red-100 text-red-700")} onClick={onClick}>🔴 Urgent</span>;
  if (urgency === "action") return <span className={cn(base, "bg-amber-100 text-amber-700")} onClick={onClick}>🟡 Action</span>;
  return <span className={cn(base, "bg-green-100 text-green-700")} onClick={onClick}>🟢 Monitor</span>;
}

function ClientStatusBadge({ status, onClick }: { status: ClientStatus; onClick?: () => void }) {
  const base = "rounded-full text-[11px] font-semibold px-2 py-0.5 cursor-pointer select-none transition-opacity hover:opacity-80";
  if (status === "At Risk")
    return <span className={cn(base, "bg-amber-100 text-amber-700")} onClick={onClick}>At Risk</span>;
  return <span className={cn(base, "bg-green-100 text-green-700")} onClick={onClick}>Active</span>;
}

function OwnerBadge({ initials }: { initials: string }) {
  const colors: Record<string, string> = {
    A: "bg-blue-100 text-blue-700",
    R: "bg-teal-100 text-teal-700",
    Ai: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colors[initials] ?? "bg-muted text-muted-foreground"}`}>
      {initials}
    </span>
  );
}

// ─── Drag-and-drop hook ───────────────────────────────────────────────────────
function useDraggableList<T extends { id: number }>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const onDragStart = useCallback((idx: number) => {
    dragItem.current = idx;
    setDraggingId(items[idx].id);
  }, [items]);

  const onDragEnter = useCallback((idx: number) => {
    dragOver.current = idx;
    setOverIdx(idx);
  }, []);

  const onDragEnd = useCallback(() => {
    if (dragItem.current !== null && dragOver.current !== null && dragItem.current !== dragOver.current) {
      const next = [...items];
      const [moved] = next.splice(dragItem.current, 1);
      next.splice(dragOver.current, 0, moved);
      setItems(next);
    }
    dragItem.current = null;
    dragOver.current = null;
    setDraggingId(null);
    setOverIdx(null);
  }, [items]);

  const updateItem = useCallback((id: number, patch: Partial<T>) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const deleteItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addItem = useCallback((item: T) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const reset = useCallback((original: T[]) => setItems(original), []);

  return { items, setItems, onDragStart, onDragEnter, onDragEnd, draggingId, overIdx, updateItem, deleteItem, addItem, reset };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [period, setPeriod] = useState("This Quarter");

  const searches = useDraggableList<SearchRow>(INIT_SEARCHES);
  const actions = useDraggableList<PriorityAction>(INIT_ACTIONS);
  const clients = useDraggableList<ClientRow>(INIT_CLIENTS);
  const recruiters = useDraggableList<RecruiterRow>(INIT_RECRUITERS);

  const stalledCount = searches.items.filter((s) => s.health === "Stalled").length;
  const atRiskCount = searches.items.filter((s) => s.health === "At Risk").length;
  const healthyCount = searches.items.filter((s) => s.health === "Healthy").length;

  // ── drag row props helper ──────────────────────────────────────────────────
  function dragProps(list: ReturnType<typeof useDraggableList>, idx: number, id: number) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; list.onDragStart(idx); },
      onDragEnter: () => list.onDragEnter(idx),
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDragEnd: list.onDragEnd,
      className: cn(
        "border-b border-border transition-all",
        list.draggingId === id ? "opacity-40" : "",
        list.overIdx === idx && list.draggingId !== id ? "border-t-2 border-t-primary" : "",
      ),
    };
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live analytics · drag rows to reorder · click values to edit · click badges to change status
          </p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {periods.map((p) => (
            <Button key={p} variant={period === p ? "default" : "ghost"} size="sm" className="text-xs h-7 px-3" onClick={() => setPeriod(p)}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="velocity" className="text-xs">Pipeline Velocity</TabsTrigger>
          <TabsTrigger value="recruiters" className="text-xs">Recruiter Performance</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs">Client Analytics</TabsTrigger>
          <TabsTrigger value="placements" className="text-xs">Placement Trends</TabsTrigger>
        </TabsList>

        {/* ══ TAB 1: OVERVIEW ══════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border border-card-border"><CardContent className="p-4">
              <Briefcase size={16} className="text-blue-500" />
              <p className="text-2xl font-bold font-display mt-2 tabular-nums">{searches.items.length}</p>
              <p className="text-xs text-muted-foreground">Active Searches</p>
              <p className="text-[10px] text-muted-foreground mt-1">{stalledCount} stalled · {atRiskCount} at risk</p>
            </CardContent></Card>
            <Card className="border border-card-border"><CardContent className="p-4">
              <TrendingUp size={16} className="text-green-500" />
              <p className="text-2xl font-bold font-display mt-2 tabular-nums">67%</p>
              <p className="text-xs text-muted-foreground">Fill Rate This Quarter</p>
              <div className="flex items-center gap-1 mt-1"><ArrowUpRight size={11} className="text-green-500" /><span className="text-[10px] text-green-600 font-medium">from 42% last qtr</span></div>
            </CardContent></Card>
            <Card className="border border-card-border"><CardContent className="p-4">
              <Clock size={16} className="text-cyan-500" />
              <p className="text-2xl font-bold font-display mt-2 tabular-nums">38d</p>
              <p className="text-xs text-muted-foreground">Avg Days to Fill</p>
              <div className="flex items-center gap-1 mt-1"><ArrowDownRight size={11} className="text-green-500" /><span className="text-[10px] text-green-600 font-medium">from 51d last qtr</span></div>
            </CardContent></Card>
            <Card className="border border-card-border"><CardContent className="p-4">
              <DollarSign size={16} className="text-teal-500" />
              <p className="text-2xl font-bold font-display mt-2 tabular-nums">$2.4M</p>
              <p className="text-xs text-muted-foreground">Revenue Pipeline</p>
              <p className="text-[10px] text-muted-foreground mt-1">fee potential</p>
            </CardContent></Card>
            <Card className="border border-card-border bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="p-4">
              <AlertTriangle size={16} className="text-amber-500" />
              <p className="text-2xl font-bold font-display mt-2 tabular-nums text-amber-600">{atRiskCount + stalledCount}</p>
              <p className="text-xs text-muted-foreground">At-Risk Searches</p>
              <p className="text-[10px] text-amber-600 font-medium mt-1">needs attention</p>
            </CardContent></Card>
            <Card className="border border-card-border"><CardContent className="p-4">
              <Trophy size={16} className="text-purple-500" />
              <p className="text-2xl font-bold font-display mt-2 tabular-nums">3</p>
              <p className="text-xs text-muted-foreground">Placements MTD</p>
              <p className="text-[10px] text-muted-foreground mt-1">Jan 2025</p>
            </CardContent></Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Search Health Board */}
            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 size={14} className="text-muted-foreground" />
                    Search Health Board
                  </CardTitle>
                  <div className="flex gap-1.5 flex-wrap text-[10px]">
                    <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-semibold">{stalledCount} Stalled</span>
                    <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">{atRiskCount} At Risk</span>
                    <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">{healthyCount} Healthy</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Drag to reorder · click badge to change status · click text to edit</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {searches.items.map((row, i) => (
                    <div
                      key={row.id}
                      {...dragProps(searches, i, row.id)}
                    >
                      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors group/row">
                        <GripVertical size={13} className="text-muted-foreground/40 group-hover/row:text-muted-foreground cursor-grab flex-shrink-0" />
                        <OwnerBadge initials={row.owner} />
                        <div className="flex-1 min-w-0">
                          <EditableCell
                            value={row.client}
                            onSave={(v) => searches.updateItem(row.id, { client: v })}
                            className="text-xs font-semibold"
                          />
                          <EditableCell
                            value={row.title}
                            onSave={(v) => searches.updateItem(row.id, { title: v })}
                            className="text-[11px] text-muted-foreground"
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <EditableCell value={row.daysOpen} onSave={(v) => searches.updateItem(row.id, { daysOpen: Number(v) })} numeric className="text-[11px] font-medium tabular-nums justify-end" />
                            <p className="text-[10px] text-muted-foreground">open</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <EditableCell value={row.candidates} onSave={(v) => searches.updateItem(row.id, { candidates: Number(v) })} numeric className="text-[11px] font-medium tabular-nums justify-end" />
                            <p className="text-[10px] text-muted-foreground">in pipe</p>
                          </div>
                          <HealthBadge
                            health={row.health}
                            onClick={() => {
                              const next = HEALTH_CYCLE[(HEALTH_CYCLE.indexOf(row.health) + 1) % HEALTH_CYCLE.length];
                              searches.updateItem(row.id, { health: next });
                            }}
                          />
                          <button
                            className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-1"
                            onClick={() => searches.deleteItem(row.id)}
                            title="Remove row"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-border flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => searches.addItem({ id: Date.now(), client: "New Client", title: "New Role", health: "Healthy", daysOpen: 0, candidates: 0, owner: "A" })}>
                    <Plus size={12} /> Add Row
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => searches.reset(INIT_SEARCHES)}>
                    <RotateCcw size={12} /> Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Priority Actions */}
            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" />
                  Today's Priority Actions
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">Drag to reorder · click badge to change urgency · click text to edit · check to dismiss</p>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {actions.items.map((action, i) => (
                  <div
                    key={action.id}
                    {...dragProps(actions, i, action.id)}
                    className={cn(
                      dragProps(actions, i, action.id).className,
                      "rounded-lg border !border-b p-3 group/act",
                      action.done ? "opacity-50" : "",
                      action.urgency === "urgent" ? "bg-red-50/60 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                        : action.urgency === "action" ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                        : "bg-green-50/60 border-green-200 dark:bg-green-950/20 dark:border-green-900",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical size={13} className="text-muted-foreground/40 group-hover/act:text-muted-foreground cursor-grab mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <UrgencyBadge urgency={action.urgency} onClick={() => {
                            const next = URGENCY_CYCLE[(URGENCY_CYCLE.indexOf(action.urgency) + 1) % URGENCY_CYCLE.length];
                            actions.updateItem(action.id, { urgency: next });
                          }} />
                        </div>
                        <EditableCell value={action.text} onSave={(v) => actions.updateItem(action.id, { text: v })} className="text-xs leading-snug" />
                        <EditableCell value={action.search} onSave={(v) => actions.updateItem(action.id, { search: v })} className="text-[10px] text-muted-foreground mt-1 font-medium" />
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          className={cn("p-0.5 rounded transition-colors", action.done ? "text-green-600" : "text-muted-foreground hover:text-green-600")}
                          onClick={() => actions.updateItem(action.id, { done: !action.done })}
                          title={action.done ? "Mark undone" : "Mark done"}
                        >
                          <Check size={13} />
                        </button>
                        <button className="opacity-0 group-hover/act:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={() => actions.deleteItem(action.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => actions.addItem({ id: Date.now(), urgency: "action", text: "New action item", search: "Client · Role", done: false })}>
                    <Plus size={12} /> Add Action
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => actions.reset(INIT_ACTIONS)}>
                    <RotateCcw size={12} /> Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ TAB 2: PIPELINE VELOCITY ══════════════════════════════════════════ */}
        <TabsContent value="velocity" className="space-y-4">
          <div className="rounded-lg border border-orange-200 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-900 p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Bottleneck Identified: Interview Stage</p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">Interview stage is your biggest bottleneck: avg 18 days. Industry benchmark: 12 days. Closing this gap could reduce overall time-to-fill by ~35%.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Stage Conversion Rates</CardTitle>
                <p className="text-[11px] text-muted-foreground">% of candidates advancing to next stage</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={conversionFunnel} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={130} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Conversion"]} />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={20}>{conversionFunnel.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Avg Days at Each Stage</CardTitle>
                <p className="text-[11px] text-muted-foreground">Where time is being spent in the process</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stageTime} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}d`} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={70} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} days`, "Avg Duration"]} />
                    <Bar dataKey="days" radius={[0, 4, 4, 0]} barSize={28}>{stageTime.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-card-border lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Avg Days-to-Fill Trend</CardTitle>
                <p className="text-[11px] text-muted-foreground">Improving velocity over the last 6 months</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={velocityTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[30, 60]} tickFormatter={(v) => `${v}d`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} days`, "Avg to Fill"]} />
                    <Line type="monotone" dataKey="days" stroke="hsl(199, 89%, 48%)" strokeWidth={2.5} dot={{ fill: "hsl(199, 89%, 48%)", r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ TAB 3: RECRUITER PERFORMANCE ══════════════════════════════════════ */}
        <TabsContent value="recruiters" className="space-y-4">
          <Card className="border border-card-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  Recruiter Leaderboard
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => recruiters.addItem({ id: Date.now(), name: "New Recruiter", searches: 0, submitted: 0, interviews: 0, placements: 0, avgDays: null, fillRate: null })}>
                    <Plus size={12} /> Add
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => recruiters.reset(INIT_RECRUITERS)}>
                    <RotateCcw size={12} /> Reset
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Drag to reorder · click any value to edit</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="w-6 px-2"></th>
                      <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5">Recruiter</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Searches</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Submitted</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Interviews</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Placements</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Avg Days</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Fill Rate</th>
                      <th className="w-6 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recruiters.items.map((r, i) => (
                      <tr
                        key={r.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; recruiters.onDragStart(i); }}
                        onDragEnter={() => recruiters.onDragEnter(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={recruiters.onDragEnd}
                        className={cn(
                          "border-b border-border last:border-0 hover:bg-muted/30 transition-colors group/row",
                          recruiters.draggingId === r.id ? "opacity-40" : "",
                          recruiters.overIdx === i && recruiters.draggingId !== r.id ? "border-t-2 border-t-primary" : "",
                        )}
                      >
                        <td className="px-2 py-3"><GripVertical size={13} className="text-muted-foreground/40 group-hover/row:text-muted-foreground cursor-grab" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && <Trophy size={12} className="text-amber-500 flex-shrink-0" />}
                            <EditableCell value={r.name} onSave={(v) => recruiters.updateItem(r.id, { name: v })} className="font-medium text-sm" />
                          </div>
                        </td>
                        <td className="text-center px-3 py-3"><EditableCell value={r.searches} numeric onSave={(v) => recruiters.updateItem(r.id, { searches: Number(v) })} className="tabular-nums text-sm justify-center" /></td>
                        <td className="text-center px-3 py-3"><EditableCell value={r.submitted} numeric onSave={(v) => recruiters.updateItem(r.id, { submitted: Number(v) })} className="tabular-nums text-sm justify-center" /></td>
                        <td className="text-center px-3 py-3"><EditableCell value={r.interviews} numeric onSave={(v) => recruiters.updateItem(r.id, { interviews: Number(v) })} className="tabular-nums text-sm justify-center" /></td>
                        <td className="text-center px-3 py-3">
                          <EditableCell value={r.placements} numeric onSave={(v) => recruiters.updateItem(r.id, { placements: Number(v) })}
                            className={cn("tabular-nums text-sm font-semibold justify-center", r.placements > 0 ? "text-green-600" : "text-muted-foreground")} />
                        </td>
                        <td className="text-center px-3 py-3">
                          <EditableCell value={r.avgDays ?? "—"} numeric onSave={(v) => recruiters.updateItem(r.id, { avgDays: v === "—" || v === "" ? null : Number(v) })}
                            className="tabular-nums text-sm justify-center" />
                        </td>
                        <td className="text-center px-3 py-3">
                          {r.fillRate != null ? (
                            <div className="flex items-center gap-2 justify-center">
                              <Progress value={r.fillRate} className="h-1.5 w-16" />
                              <EditableCell value={r.fillRate} numeric onSave={(v) => recruiters.updateItem(r.id, { fillRate: Number(v) })} className="text-xs tabular-nums font-medium" />
                              <span className="text-xs">%</span>
                            </div>
                          ) : (
                            <EditableCell value="—" onSave={(v) => recruiters.updateItem(r.id, { fillRate: v === "—" || v === "" ? null : Number(v) })} className="text-muted-foreground text-sm justify-center" />
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <button className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => recruiters.deleteItem(r.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Activity Breakdown (Last 30 Days)</CardTitle>
                <p className="text-[11px] text-muted-foreground">Calls, emails, and submittals per recruiter</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={activityBreakdown} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip {...tooltipStyle} />
                    <Legend verticalAlign="bottom" height={28} formatter={(v) => <span className="text-xs">{v}</span>} />
                    <Bar dataKey="calls" name="Calls" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} barSize={18} />
                    <Bar dataKey="emails" name="Emails" fill="hsl(199, 89%, 48%)" radius={[3, 3, 0, 0]} barSize={18} />
                    <Bar dataKey="submittals" name="Submittals" fill="hsl(168, 76%, 42%)" radius={[3, 3, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Busiest Day of Week</CardTitle>
                <p className="text-[11px] text-muted-foreground">Total activities Mon–Fri (last 30 days)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={busiestDays} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "Activities"]} />
                    <Bar dataKey="activities" radius={[4, 4, 0, 0]} barSize={36}>
                      {busiestDays.map((e, i) => (
                        <Cell key={i} fill={e.activities === Math.max(...busiestDays.map((d) => d.activities)) ? "hsl(199, 89%, 48%)" : "hsl(217, 91%, 60%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ TAB 4: CLIENT ANALYTICS ══════════════════════════════════════════ */}
        <TabsContent value="clients" className="space-y-4">
          <div className="rounded-lg border border-teal-200 bg-teal-50/60 dark:bg-teal-950/20 dark:border-teal-900 p-4 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-teal-500 flex-shrink-0" />
            <p className="text-sm text-teal-800 dark:text-teal-300 font-medium">
              Client Retention: {clients.items.filter((c) => c.status === "Active").length} of {clients.items.length} clients are active — indicating strong relationship quality and delivery track record.
            </p>
          </div>

          <Card className="border border-card-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Client Overview</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => clients.addItem({ id: Date.now(), client: "New Client", pe: "PE Firm", searches: 0, submitted: 0, interviews: 0, status: "Active", lastActivity: "Today" })}>
                    <Plus size={12} /> Add Client
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => clients.reset(INIT_CLIENTS)}>
                    <RotateCcw size={12} /> Reset
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Drag to reorder · click any value to edit · click status badge to toggle</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="w-6 px-2"></th>
                      <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5">Client</th>
                      <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5">PE Firm</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Searches</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Submitted</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Interviews</th>
                      <th className="text-center text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Status</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground px-4 py-2.5">Last Activity</th>
                      <th className="w-6 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.items.map((c, i) => (
                      <tr
                        key={c.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; clients.onDragStart(i); }}
                        onDragEnter={() => clients.onDragEnter(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={clients.onDragEnd}
                        className={cn(
                          "border-b border-border last:border-0 hover:bg-muted/30 transition-colors group/row",
                          clients.draggingId === c.id ? "opacity-40" : "",
                          clients.overIdx === i && clients.draggingId !== c.id ? "border-t-2 border-t-primary" : "",
                        )}
                      >
                        <td className="px-2 py-2.5"><GripVertical size={13} className="text-muted-foreground/40 group-hover/row:text-muted-foreground cursor-grab" /></td>
                        <td className="px-4 py-2.5"><EditableCell value={c.client} onSave={(v) => clients.updateItem(c.id, { client: v })} className="font-medium text-sm" /></td>
                        <td className="px-3 py-2.5"><EditableCell value={c.pe} onSave={(v) => clients.updateItem(c.id, { pe: v })} className="text-xs text-muted-foreground" /></td>
                        <td className="text-center px-3 py-2.5"><EditableCell value={c.searches} numeric onSave={(v) => clients.updateItem(c.id, { searches: Number(v) })} className="tabular-nums text-sm justify-center" /></td>
                        <td className="text-center px-3 py-2.5"><EditableCell value={c.submitted} numeric onSave={(v) => clients.updateItem(c.id, { submitted: Number(v) })} className="tabular-nums text-sm justify-center" /></td>
                        <td className="text-center px-3 py-2.5"><EditableCell value={c.interviews} numeric onSave={(v) => clients.updateItem(c.id, { interviews: Number(v) })} className="tabular-nums text-sm justify-center" /></td>
                        <td className="text-center px-3 py-2.5">
                          <ClientStatusBadge status={c.status} onClick={() => {
                            const next = CLIENT_STATUS_CYCLE[(CLIENT_STATUS_CYCLE.indexOf(c.status) + 1) % CLIENT_STATUS_CYCLE.length];
                            clients.updateItem(c.id, { status: next });
                          }} />
                        </td>
                        <td className="text-right px-4 py-2.5"><EditableCell value={c.lastActivity} onSave={(v) => clients.updateItem(c.id, { lastActivity: v })} className="text-xs text-muted-foreground justify-end" /></td>
                        <td className="px-2 py-2.5">
                          <button className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => clients.deleteItem(c.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue by Client (Fee Potential)</CardTitle>
              <p className="text-[11px] text-muted-foreground">Estimated fee potential across all active searches</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={clientRevenue} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="client" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={110} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, "Fee Potential"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>{clientRevenue.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB 5: PLACEMENT TRENDS ══════════════════════════════════════════ */}
        <TabsContent value="placements" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Placements by Month</CardTitle>
                <p className="text-[11px] text-muted-foreground">12-month placement history</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={placementsByMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "Placements"]} />
                    <Bar dataKey="placements" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Revenue: Realized vs Pipeline</CardTitle>
                <p className="text-[11px] text-muted-foreground">Fees closed vs total fee potential</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueArea} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradRealized" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`]} />
                    <Legend verticalAlign="bottom" height={28} formatter={(v) => <span className="text-xs">{v}</span>} />
                    <Area type="monotone" dataKey="pipeline" name="Pipeline" stroke="hsl(199, 89%, 48%)" strokeWidth={2} fill="url(#gradPipeline)" />
                    <Area type="monotone" dataKey="realized" name="Realized" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#gradRealized)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Placement by Function</CardTitle>
                <p className="text-[11px] text-muted-foreground">Distribution across executive functions</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={placementByFunction} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                      {placementByFunction.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Share"]} />
                    <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-xs">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Time-to-Fill Trend (Days)</CardTitle>
                <p className="text-[11px] text-muted-foreground">Improving — down 13 days over 6 months</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeToFillTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[30, 60]} tickFormatter={(v) => `${v}d`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} days`, "Avg to Fill"]} />
                    <Line type="monotone" dataKey="days" stroke="hsl(217, 91%, 60%)" strokeWidth={2.5} dot={{ fill: "hsl(217, 91%, 60%)", r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Source of Placements</CardTitle>
              <p className="text-[11px] text-muted-foreground">Where placed candidates originated</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {placementSource.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-right text-muted-foreground flex-shrink-0">{s.source}</div>
                  <div className="flex-1"><Progress value={s.pct} className="h-2" style={{ "--progress-fill": s.fill } as React.CSSProperties} /></div>
                  <div className="w-10 text-xs tabular-nums font-semibold text-right">{s.pct}%</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
