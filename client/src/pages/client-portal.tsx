import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Building2,
  Users,
  Calendar,
  Clock,
  Mail,
  Phone,
  FileText,
  Share2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Briefcase,
  MessageSquare,
  Send,
  Activity,
  TrendingUp,
  UserCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type HealthStatus = "Healthy" | "At Risk" | "Stalled";

type PipelineStage =
  | "Sourcing"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Placed";

interface Candidate {
  id: string;
  name: string;
  title: string;
  company: string;
  searchId: string;
  stage: PipelineStage;
  lastAction: string;
  lastActionDate: string;
  health: HealthStatus;
}

interface Search {
  id: string;
  title: string;
  openDate: string;
  daysOpen: number;
  owner: string;
  health: HealthStatus;
  atRiskReason?: string;
  stageCounts: Record<PipelineStage, number>;
}

interface ActivityItem {
  id: string;
  date: string;
  type: "email" | "call" | "submittal" | "interview" | "note";
  description: string;
  person: string;
}

interface ClientNote {
  id: string;
  date: string;
  author: string;
  text: string;
}

interface Client {
  id: string;
  name: string;
  sponsor: string;
  slug: string;
  lastActivity: string;
  searches: Search[];
  candidates: Candidate[];
  activity: ActivityItem[];
  notes: ClientNote[];
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const CLIENTS: Client[] = []; // removed — real data from API

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOverallHealth(searches: Search[]): HealthStatus {
  if (searches.every((s) => s.health === "Stalled")) return "Stalled";
  if (searches.some((s) => s.health === "Stalled" || s.health === "At Risk")) return "At Risk";
  return "Healthy";
}

function healthDot(health: HealthStatus) {
  if (health === "Healthy") return "bg-emerald-500";
  if (health === "At Risk") return "bg-amber-400";
  return "bg-red-500";
}

function healthBadgeClasses(health: HealthStatus) {
  if (health === "Healthy")
    return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (health === "At Risk")
    return "bg-amber-400/15 text-amber-600 border-amber-400/30";
  return "bg-red-500/15 text-red-600 border-red-500/30";
}

function HealthIcon({ health }: { health: HealthStatus }) {
  if (health === "Healthy")
    return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (health === "At Risk")
    return <AlertTriangle size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

const STAGES: PipelineStage[] = [
  "Sourcing",
  "Screening",
  "Interview",
  "Offer",
  "Placed",
];

const STAGE_COLORS: Record<PipelineStage, string> = {
  Sourcing: "bg-slate-400",
  Screening: "bg-blue-400",
  Interview: "bg-violet-500",
  Offer: "bg-amber-400",
  Placed: "bg-emerald-500",
};

function stageProgress(stageCounts: Record<PipelineStage, number>): number {
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const weighted =
    stageCounts.Sourcing * 10 +
    stageCounts.Screening * 30 +
    stageCounts.Interview * 60 +
    stageCounts.Offer * 85 +
    stageCounts.Placed * 100;
  return Math.round(weighted / total);
}

const ACTIVITY_ICONS: Record<ActivityItem["type"], typeof Mail> = {
  email: Mail,
  call: Phone,
  submittal: FileText,
  interview: Calendar,
  note: MessageSquare,
};

const ACTIVITY_COLORS: Record<ActivityItem["type"], string> = {
  email: "bg-blue-500/15 text-blue-600",
  call: "bg-violet-500/15 text-violet-600",
  submittal: "bg-teal-500/15 text-teal-600",
  interview: "bg-amber-400/15 text-amber-600",
  note: "bg-slate-400/15 text-slate-600",
};

function ownerInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

const OWNER_COLORS: Record<string, string> = {
  Andrew: "bg-blue-600",
  Ryan: "bg-violet-600",
  Aileen: "bg-teal-600",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StagePipeline({
  stageCounts,
}: {
  stageCounts: Record<PipelineStage, number>;
}) {
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 h-2 rounded-full overflow-hidden">
        {STAGES.map((stage) => {
          const count = stageCounts[stage];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return pct > 0 ? (
            <div
              key={stage}
              className={`${STAGE_COLORS[stage]} rounded-full transition-all`}
              style={{ width: `${pct}%` }}
              title={`${stage}: ${count}`}
            />
          ) : null;
        })}
        {total === 0 && <div className="bg-muted rounded-full w-full" />}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {STAGES.map((stage) => (
          <span key={stage} className="text-[10px] text-muted-foreground">
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STAGE_COLORS[stage]}`} />
            {stage} {stageCounts[stage]}
          </span>
        ))}
      </div>
    </div>
  );
}

function SearchCard({ search }: { search: Search }) {
  return (
    <Card className="border border-card-border" data-testid={`search-card-${search.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{search.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Opened {search.openDate} · <span className="font-medium text-foreground">{search.daysOpen} days open</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant="outline"
              className={`text-[11px] h-5 px-2 border ${healthBadgeClasses(search.health)}`}
              data-testid={`health-badge-${search.id}`}
            >
              <HealthIcon health={search.health} />
              <span className="ml-1">{search.health}</span>
            </Badge>
          </div>
        </div>

        {search.atRiskReason && (
          <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1.5">
            <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">{search.atRiskReason}</p>
          </div>
        )}

        <StagePipeline stageCounts={search.stageCounts} />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback
                className={`text-[9px] text-white ${OWNER_COLORS[search.owner] ?? "bg-slate-500"}`}
              >
                {ownerInitials(search.owner)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{search.owner}</span>
          </div>
          <Progress value={stageProgress(search.stageCounts)} className="h-1 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientPortal() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("1");
  const [clientSearch, setClientSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");

  const filteredClients = CLIENTS.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.sponsor.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const client = CLIENTS.find((c) => c.id === selectedClientId) ?? CLIENTS[0];
  const overallHealth = getOverallHealth(client.searches);

  const totalCandidates = client.candidates.length;
  const interviewsScheduled = client.candidates.filter(
    (c) => c.stage === "Interview"
  ).length;
  const healthCounts = {
    Healthy: client.searches.filter((s) => s.health === "Healthy").length,
    "At Risk": client.searches.filter((s) => s.health === "At Risk").length,
    Stalled: client.searches.filter((s) => s.health === "Stalled").length,
  };

  function handleSharePortal() {
    const url = `portal.hirecommand.app/client/${client.slug}`;
    toast({
      title: "Client portal link copied",
      description: url,
    });
  }

  function handleSendUpdate() {
    toast({
      title: "Update sent",
      description: `Weekly status update dispatched to ${client.name} contacts.`,
    });
  }

  function handleAddNote() {
    if (!newNote.trim()) return;
    toast({
      title: "Note saved",
      description: "Your note has been added to the client record.",
    });
    setNewNote("");
  }

  function handleSelectClient(id: string) {
    setSelectedClientId(id);
    setActiveTab("overview");
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden -m-6">
      {/* ── LEFT SIDEBAR ── */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border space-y-3">
          <h2 className="font-display font-semibold text-sm text-foreground">
            Client Portal
          </h2>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              data-testid="input-client-search"
              placeholder="Search clients or sponsors…"
              className="pl-8 h-8 text-xs"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredClients.map((c) => {
              const health = getOverallHealth(c.searches);
              const isSelected = c.id === selectedClientId;
              return (
                <button
                  key={c.id}
                  data-testid={`client-item-${c.id}`}
                  onClick={() => handleSelectClient(c.id)}
                  className={`w-full text-left rounded-lg p-3 transition-colors ${
                    isSelected
                      ? "bg-primary/10 border border-primary/25"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${healthDot(health)}`}
                        />
                        <p className="text-xs font-semibold text-foreground truncate">
                          {c.name}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-3.5">
                        {c.sponsor}
                      </p>
                    </div>
                    <ChevronRight
                      size={12}
                      className={`flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected ? "text-primary" : "text-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-2 ml-3.5">
                    <span className="text-[10px] text-muted-foreground">
                      <Briefcase size={9} className="inline mr-0.5" />
                      {c.searches.length} search{c.searches.length !== 1 ? "es" : ""}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      <Clock size={9} className="inline mr-0.5" />
                      {c.lastActivity}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredClients.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No clients found
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 size={18} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="font-display font-bold text-base text-foreground"
                  data-testid="text-client-name"
                >
                  {client.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[11px] h-5 px-2 border ${healthBadgeClasses(overallHealth)}`}
                  data-testid="badge-overall-health"
                >
                  <HealthIcon health={overallHealth} />
                  <span className="ml-1">{overallHealth}</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {client.sponsor} · {client.searches.length} active{" "}
                {client.searches.length === 1 ? "search" : "searches"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="btn-share-portal"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleSharePortal}
            >
              <Share2 size={13} />
              Share Portal
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b border-border bg-card flex-shrink-0">
            <TabsList className="h-9 bg-transparent p-0 gap-0 rounded-none">
              {(["overview", "searches", "candidates", "activity"] as const).map(
                (tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    data-testid={`tab-${tab}`}
                    className="rounded-none h-9 px-4 text-xs capitalize border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </TabsTrigger>
                )
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            {/* ── OVERVIEW TAB ── */}
            <TabsContent value="overview" className="m-0 p-6 space-y-5">
              {/* KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border border-card-border" data-testid="kpi-active-searches">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Briefcase size={15} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold font-display">
                      {client.searches.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Active Searches
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-card-border" data-testid="kpi-total-candidates">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Users size={15} className="text-violet-500" />
                    </div>
                    <div className="text-2xl font-bold font-display">
                      {totalCandidates}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Candidates in Pipeline
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-card-border" data-testid="kpi-interviews">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar size={15} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold font-display">
                      {interviewsScheduled}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Interviews Scheduled
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-card-border" data-testid="kpi-last-update">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Clock size={15} className="text-teal-500" />
                    </div>
                    <div className="text-2xl font-bold font-display">
                      {client.lastActivity}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Last Activity
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                {/* Deal Health Summary */}
                <Card className="border border-card-border" data-testid="card-deal-health">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-muted-foreground" />
                      Deal Health Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2.5">
                    {(["Healthy", "At Risk", "Stalled"] as HealthStatus[]).map(
                      (h) => (
                        <div key={h} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${healthDot(h)}`} />
                            <span className="text-sm">{h}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-1.5 rounded-full ${healthDot(h)} opacity-30`}
                              style={{
                                width: `${
                                  client.searches.length > 0
                                    ? (healthCounts[h] / client.searches.length) * 80
                                    : 0
                                }px`,
                                minWidth: "4px",
                              }}
                            />
                            <span className="text-sm font-semibold w-4 text-right">
                              {healthCounts[h]}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity Feed */}
                <Card className="lg:col-span-2 border border-card-border" data-testid="card-recent-activity">
                  <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Activity size={14} className="text-muted-foreground" />
                      Recent Activity
                    </CardTitle>
                    <Button
                      data-testid="btn-send-update"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleSendUpdate}
                    >
                      <Send size={11} />
                      Send Update to Client
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-0">
                    {client.activity.slice(0, 5).map((item, idx) => {
                      const Icon = ACTIVITY_ICONS[item.type];
                      return (
                        <div key={item.id}>
                          <div className="flex items-start gap-3 py-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ACTIVITY_COLORS[item.type]}`}
                            >
                              <Icon size={12} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-relaxed">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  {item.date}
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <Avatar className="h-3.5 w-3.5">
                                  <AvatarFallback
                                    className={`text-[7px] text-white ${OWNER_COLORS[item.person] ?? "bg-slate-500"}`}
                                  >
                                    {ownerInitials(item.person)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] text-muted-foreground">
                                  {item.person}
                                </span>
                              </div>
                            </div>
                          </div>
                          {idx < Math.min(client.activity.length, 5) - 1 && (
                            <Separator />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Client Notes */}
              <Card className="border border-card-border" data-testid="card-notes">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText size={14} className="text-muted-foreground" />
                    Notes & Client Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {client.notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-muted/40 rounded-lg p-3 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback
                            className={`text-[9px] text-white ${OWNER_COLORS[note.author] ?? "bg-slate-500"}`}
                          >
                            {ownerInitials(note.author)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{note.author}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {note.date}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">
                        {note.text}
                      </p>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Input
                      data-testid="input-new-note"
                      placeholder="Add a note or client feedback…"
                      className="h-8 text-xs"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNote();
                      }}
                    />
                    <Button
                      data-testid="btn-add-note"
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={handleAddNote}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── SEARCHES TAB ── */}
            <TabsContent value="searches" className="m-0 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Active Searches ({client.searches.length})
                </h2>
              </div>
              <div className="space-y-4">
                {client.searches.map((search) => (
                  <SearchCard key={search.id} search={search} />
                ))}
              </div>
            </TabsContent>

            {/* ── CANDIDATES TAB ── */}
            <TabsContent value="candidates" className="m-0 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">
                All Candidates ({client.candidates.length})
              </h2>
              <Card className="border border-card-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-testid="table-candidates">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Candidate
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Current Company
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Search
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Stage
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Last Action
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Health
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.candidates.map((candidate, idx) => {
                        const search = client.searches.find(
                          (s) => s.id === candidate.searchId
                        );
                        return (
                          <tr
                            key={candidate.id}
                            data-testid={`candidate-row-${candidate.id}`}
                            className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                              idx % 2 === 0 ? "" : "bg-muted/10"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {candidate.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .substring(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{candidate.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {candidate.title}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {candidate.company}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {search?.title ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 px-2"
                              >
                                {candidate.stage}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <p>{candidate.lastAction}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {candidate.lastActionDate}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${healthDot(candidate.health)}`}
                                  data-testid={`health-dot-${candidate.id}`}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {candidate.health}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* ── ACTIVITY TAB ── */}
            <TabsContent value="activity" className="m-0 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">
                Activity Timeline ({client.activity.length} items)
              </h2>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
                <div className="space-y-0">
                  {client.activity.map((item, idx) => {
                    const Icon = ACTIVITY_ICONS[item.type];
                    return (
                      <div
                        key={item.id}
                        data-testid={`activity-item-${item.id}`}
                        className="relative flex items-start gap-4 pb-5 last:pb-0"
                      >
                        <div
                          className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-background ${ACTIVITY_COLORS[item.type]}`}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-4 px-1.5 capitalize"
                                >
                                  {item.type}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {item.date}
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-3.5 w-3.5">
                                    <AvatarFallback
                                      className={`text-[7px] text-white ${OWNER_COLORS[item.person] ?? "bg-slate-500"}`}
                                    >
                                      {ownerInitials(item.person)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.person}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {client.activity.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <UserCheck size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No activity recorded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
