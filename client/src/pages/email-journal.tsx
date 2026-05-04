import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, RefreshCw, Link, Inbox, Send, CheckCircle2, AlertCircle, Users } from "lucide-react";
import type { EmailJournal } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GmailStatus {
  connected: boolean;
  emailAddress: string | null;
  lastSync: string | null;
}

interface SyncStats {
  success: boolean;
  synced: number;
  matched: number;
  unmatched: number;
  errors: string[];
}

// ─── Email Thread Card ─────────────────────────────────────────────────────────

function EmailCard({ email, showMatch = false, onMatch }: {
  email: EmailJournal;
  showMatch?: boolean;
  onMatch?: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const toEmails: string[] = (() => { try { return JSON.parse(email.toEmails || "[]"); } catch { return []; } })();
  const isOutbound = (email.labelIds || "").includes("SENT");
  const sentDate = email.sentAt ? new Date(email.sentAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "";

  return (
    <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-1 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
            ${isOutbound ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
            {isOutbound ? <Send className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900 truncate">
                {email.subject || "(no subject)"}
              </span>
              {email.matched === "true" && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Linked
                </Badge>
              )}
              {email.matched !== "true" && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                  <AlertCircle className="w-3 h-3 mr-1" /> Unlinked
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {isOutbound
                ? `To: ${toEmails.slice(0, 2).join(", ")}${toEmails.length > 2 ? ` +${toEmails.length - 2}` : ""}`
                : `From: ${email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}`
              }
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{email.snippet}</p>
            {expanded && (
              <div className="mt-3 text-xs text-gray-700 whitespace-pre-wrap border-t pt-3 max-h-64 overflow-y-auto font-mono">
                {email.bodyText || "(HTML email — view in Gmail)"}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 whitespace-nowrap">{sentDate}</span>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
              onClick={() => setExpanded(e => !e)}>
              {expanded ? "Collapse" : "Expand"}
            </Button>
            {showMatch && onMatch && email.matched !== "true" && (
              <Button variant="outline" size="sm" className="h-6 text-xs px-2"
                onClick={() => onMatch(email.id)}>
                <Link className="w-3 h-3 mr-1" /> Link
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compose Modal ─────────────────────────────────────────────────────────────

function ComposeModal({ candidateId, toEmail, toName }: {
  candidateId?: number;
  toEmail?: string;
  toName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(toEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/gmail/send", {
      userId: 1, to, subject, body, candidateId,
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Email sent", description: `Sent to ${to} and logged in activity feed` });
      setOpen(false);
      setSubject(""); setBody("");
      qc.invalidateQueries({ queryKey: ["/api/gmail/threads/candidate", candidateId] });
      qc.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (e: any) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Send className="w-3.5 h-3.5" /> Email {toName || "Candidate"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">To</label>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Message</label>
            <Textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Type your message..." rows={8} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !to || !subject || !body}>
              {sendMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gmail Connection Card ─────────────────────────────────────────────────────

function GmailConnectionCard({ userId, userName }: { userId: number; userName: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: status } = useQuery<GmailStatus>({
    queryKey: ["/api/gmail/status", userId],
    queryFn: () => apiRequest("GET", `/api/gmail/status/${userId}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/gmail/sync/${userId}`).then(r => r.json()) as Promise<SyncStats>,
    onSuccess: (data) => {
      toast({
        title: "Gmail sync complete",
        description: `${data.synced} emails synced · ${data.matched} matched · ${data.unmatched} unmatched`,
      });
      qc.invalidateQueries({ queryKey: ["/api/gmail"] });
      qc.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/gmail/disconnect/${userId}`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Gmail disconnected" });
      qc.invalidateQueries({ queryKey: ["/api/gmail/status", userId] });
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
              ${status?.connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {userName[0]}
            </div>
            <div>
              <p className="font-medium text-sm">{userName}</p>
              {status?.connected
                ? <p className="text-xs text-green-600">{status.emailAddress} · Connected</p>
                : <p className="text-xs text-gray-400">Not connected</p>
              }
              {status?.lastSync && (
                <p className="text-xs text-gray-400">
                  Last sync: {new Date(status.lastSync).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {status?.connected ? (
              <>
                <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending} className="gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                  onClick={() => disconnectMutation.mutate()}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => window.location.href = `/api/gmail/connect/${userId}`}
                className="gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Connect Gmail
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EmailJournalPage() {
  const [activeTab, setActiveTab] = useState<"inbox" | "unmatched" | "connections">("inbox");
  const [search, setSearch] = useState("");

  const { data: allEmails = [], isLoading } = useQuery<EmailJournal[]>({
    queryKey: ["/api/gmail/threads/candidate/all"],
    queryFn: () => apiRequest("GET", "/api/gmail/unmatched").then(r => r.json()),
    enabled: activeTab === "unmatched",
  });

  const { data: unmatched = [] } = useQuery<EmailJournal[]>({
    queryKey: ["/api/gmail/unmatched"],
    queryFn: () => apiRequest("GET", "/api/gmail/unmatched").then(r => r.json()),
    refetchInterval: 60000,
  });

  const RECRUITERS = [
    { id: 1, name: "Andrew" },
    { id: 2, name: "Ryan" },
    { id: 3, name: "Aileen" },
  ];

  const tabs = [
    { key: "inbox",       label: "All Emails",   icon: Inbox },
    { key: "unmatched",   label: `Unmatched (${unmatched.length})`, icon: AlertCircle },
    { key: "connections", label: "Connections",  icon: Users },
  ] as const;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6" /> Email Journal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All recruiter emails, auto-matched to candidates and clients
          </p>
        </div>
        <ComposeModal />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Connections Tab */}
      {activeTab === "connections" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect each recruiter's Gmail to automatically sync and journal all recruiting emails.
            Emails are matched to candidates and clients by email address.
          </p>
          <div className="space-y-3">
            {RECRUITERS.map(r => (
              <GmailConnectionCard key={r.id} userId={r.id} userName={r.name} />
            ))}
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Setup instructions</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Add <code className="bg-blue-100 px-1 rounded">GMAIL_CLIENT_ID</code> and <code className="bg-blue-100 px-1 rounded">GMAIL_CLIENT_SECRET</code> to your Render environment variables</li>
              <li>Set <code className="bg-blue-100 px-1 rounded">GMAIL_REDIRECT_URI</code> to <code className="bg-blue-100 px-1 rounded">https://hirecommand.onrender.com/api/gmail/callback</code></li>
              <li>Enable the Gmail API in your Google Cloud Console project</li>
              <li>Click "Connect Gmail" for each recruiter above</li>
            </ol>
          </div>
        </div>
      )}

      {/* Unmatched Tab */}
      {activeTab === "unmatched" && (
        <div className="space-y-3">
          {unmatched.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400" />
              <p className="font-medium">All emails matched!</p>
              <p className="text-sm">No unlinked emails waiting for review.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                {unmatched.length} email{unmatched.length !== 1 ? "s" : ""} couldn't be auto-matched.
                Link them manually to keep your activity feed accurate.
              </p>
              {unmatched.map(email => (
                <EmailCard key={email.id} email={email} showMatch />
              ))}
            </>
          )}
        </div>
      )}

      {/* Inbox Tab */}
      {activeTab === "inbox" && (
        <div className="space-y-3">
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <p className="text-sm text-gray-500">
            Connect Gmail accounts in the Connections tab to start journaling emails here.
            Once connected, emails sync every 15 minutes automatically.
          </p>
          <div className="text-center py-16 text-gray-300 border-2 border-dashed rounded-xl">
            <Mail className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium text-gray-400">No emails synced yet</p>
            <p className="text-sm">Connect a Gmail account to start</p>
            <Button className="mt-4" variant="outline"
              onClick={() => setActiveTab("connections")}>
              Go to Connections
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Candidate Email Thread (embedded in candidate profile) ───────────────────

export function CandidateEmailThread({ candidateId, candidateEmail, candidateName }: {
  candidateId: number;
  candidateEmail?: string;
  candidateName: string;
}) {
  const { data: emails = [], isLoading } = useQuery<EmailJournal[]>({
    queryKey: ["/api/gmail/threads/candidate", candidateId],
    queryFn: () => apiRequest("GET", `/api/gmail/threads/candidate/${candidateId}`).then(r => r.json()),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
          <Mail className="w-4 h-4" /> Email History ({emails.length})
        </h3>
        <ComposeModal candidateId={candidateId} toEmail={candidateEmail} toName={candidateName} />
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading emails...</p>}

      {!isLoading && emails.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">
          No emails logged yet. Send one above or connect Gmail to auto-sync.
        </p>
      )}

      <div className="space-y-2">
        {emails.map(email => (
          <EmailCard key={email.id} email={email} />
        ))}
      </div>
    </div>
  );
}
