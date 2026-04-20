import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Upload,
  Download,
  MoreHorizontal,
  ChevronDown,
  X,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Copy,
  FileText,
  ExternalLink,
  Zap,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  status: "draft" | "sent" | "viewed" | "partial" | "paid" | "void";
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  candidateName: string;
  jobTitle: string;
  salary: number;
  feePercent: number;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  lineItems: string; // JSON string
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  notes: string;
  terms: string;
  qbInvoiceId?: string;
  qbSyncedAt?: string;
  placementId?: number;
  createdAt: string;
  updatedAt: string;
}

interface QBStatus {
  connected: boolean;
  companyName?: string;
  realmId?: string;
  lastSync?: string;
  tokenExpiry?: string;
  clientIdConfigured: boolean;
}

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_INVOICES: Invoice[] = []; // removed — real data from API

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const today = () => new Date().toISOString().slice(0, 10);

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function termsTodays(terms: string) {
  if (terms === "Net 15") return 15;
  if (terms === "Net 30") return 30;
  if (terms === "Net 45") return 45;
  if (terms === "Net 60") return 60;
  return 0;
}

function getSequence(invoices: Invoice[]) {
  const year = new Date().getFullYear();
  const nums = invoices
    .map((inv) => {
      const match = inv.invoiceNumber.match(/HC-\d{4}-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter((n) => n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `HC-${year}-${String(max + 1).padStart(3, "0")}`;
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Invoice["status"],
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  viewed: {
    label: "Viewed",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  partial: {
    label: "Partial",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  void: {
    label: "Void",
    className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 line-through",
  },
};

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge className={`text-xs border-0 font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

// ── QB Badge ─────────────────────────────────────────────────────────────────

function QBBadge({ invoice, onPush }: { invoice: Invoice; onPush: () => void }) {
  if (invoice.qbInvoiceId) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <span className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center font-bold text-[10px] text-green-700 dark:text-green-400 flex-shrink-0">
          QB
        </span>
        <CheckCircle2 size={11} />
      </div>
    );
  }
  return (
    <button
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onPush();
      }}
      data-testid={`button-qb-push-inline-${invoice.id}`}
      title="Push to QuickBooks"
    >
      <span className="w-5 h-5 rounded bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground flex-shrink-0">
        QB
      </span>
      <span className="hidden sm:inline">—</span>
    </button>
  );
}

// ── Empty Line Item ───────────────────────────────────────────────────────────

function emptyLineItem(): LineItem {
  return { description: "", quantity: 1, unitPrice: 0, amount: 0 };
}

// ── Invoice Form Modal ────────────────────────────────────────────────────────

interface InvoiceFormModalProps {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  invoices: Invoice[];
  onSaved?: (inv: Invoice) => void;
}

function InvoiceFormModal({ open, onClose, invoice, invoices, onSaved }: InvoiceFormModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const isEdit = !!invoice;

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [salary, setSalary] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [taxPercent, setTaxPercent] = useState("0");
  const [terms, setTerms] = useState("Net 30");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(addDays(today(), 30));
  const [notes, setNotes] = useState("");
  const [pushAfterSave, setPushAfterSave] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate on open / invoice change
  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setClientName(invoice.clientName);
      setClientEmail(invoice.clientEmail);
      setClientAddress(invoice.clientAddress);
      setCandidateName(invoice.candidateName);
      setJobTitle(invoice.jobTitle);
      setSalary(invoice.salary ? String(invoice.salary) : "");
      setFeePercent(invoice.feePercent ? String(invoice.feePercent) : "");
      try {
        const items: LineItem[] = JSON.parse(invoice.lineItems);
        setLineItems(items.length ? items : [emptyLineItem()]);
      } catch {
        setLineItems([emptyLineItem()]);
      }
      setTaxPercent(String(invoice.taxPercent ?? 0));
      setTerms(invoice.terms || "Net 30");
      setInvoiceNumber(invoice.invoiceNumber);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setNotes(invoice.notes || "");
    } else {
      setClientName("");
      setClientEmail("");
      setClientAddress("");
      setCandidateName("");
      setJobTitle("");
      setSalary("");
      setFeePercent("");
      setLineItems([emptyLineItem()]);
      setTaxPercent("0");
      setTerms("Net 30");
      setInvoiceNumber(getSequence(invoices));
      setIssueDate(today());
      setDueDate(addDays(today(), 30));
      setNotes("");
      setPushAfterSave(false);
    }
  }, [open, invoice]);

  // Auto-populate search fee line item when salary + feePercent both filled
  useEffect(() => {
    const s = parseFloat(salary);
    const f = parseFloat(feePercent);
    if (!isNaN(s) && s > 0 && !isNaN(f) && f > 0 && jobTitle) {
      const amount = Math.round((s * f) / 100);
      const feeDesc = `Executive Search Fee — ${jobTitle}`;
      setLineItems((prev) => {
        const feeIdx = prev.findIndex((li) =>
          li.description.startsWith("Executive Search Fee")
        );
        if (feeIdx >= 0) {
          const updated = [...prev];
          updated[feeIdx] = {
            description: feeDesc,
            quantity: 1,
            unitPrice: amount,
            amount,
          };
          return updated;
        }
        // Replace first empty line item or add new
        const emptyIdx = prev.findIndex(
          (li) => !li.description && li.unitPrice === 0
        );
        if (emptyIdx >= 0) {
          const updated = [...prev];
          updated[emptyIdx] = {
            description: feeDesc,
            quantity: 1,
            unitPrice: amount,
            amount,
          };
          return updated;
        }
        return [
          ...prev,
          { description: feeDesc, quantity: 1, unitPrice: amount, amount },
        ];
      });
    }
  }, [salary, feePercent, jobTitle]);

  // Auto-update due date when terms or issue date changes
  useEffect(() => {
    const days = termsTodays(terms);
    if (days > 0 && issueDate) {
      setDueDate(addDays(issueDate, days));
    } else if (terms === "Due on Receipt" && issueDate) {
      setDueDate(issueDate);
    }
  }, [terms, issueDate]);

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxPct = parseFloat(taxPercent) || 0;
  const taxAmount = Math.round(subtotal * taxPct) / 100;
  const total = subtotal + taxAmount;

  function updateLineItem(idx: number, field: keyof LineItem, val: string | number) {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      if (field === "description") item.description = val as string;
      else if (field === "quantity") {
        item.quantity = parseFloat(val as string) || 0;
        item.amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
      } else if (field === "unitPrice") {
        item.unitPrice = parseFloat(val as string) || 0;
        item.amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
      }
      updated[idx] = item;
      return updated;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(andPush = false) {
    if (!clientName.trim()) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        invoiceNumber: invoiceNumber.trim(),
        status: isEdit ? invoice!.status : ("draft" as const),
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientAddress: clientAddress.trim(),
        candidateName: candidateName.trim(),
        jobTitle: jobTitle.trim(),
        salary: parseFloat(salary) || 0,
        feePercent: parseFloat(feePercent) || 0,
        subtotal,
        taxPercent: taxPct,
        taxAmount,
        total,
        amountPaid: isEdit ? invoice!.amountPaid : 0,
        amountDue: total - (isEdit ? invoice!.amountPaid : 0),
        lineItems: JSON.stringify(lineItems.filter((li) => li.description || li.amount > 0)),
        issueDate,
        dueDate,
        notes: notes.trim(),
        terms,
      };

      let savedInvoice: Invoice;
      if (isEdit) {
        const r = await apiRequest("PATCH", `/api/invoices/${invoice!.id}`, payload);
        savedInvoice = await r.json();
      } else {
        const r = await apiRequest("POST", "/api/invoices", payload);
        savedInvoice = await r.json();
      }

      qc.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: isEdit ? "Invoice updated" : "Invoice created",
        description: `${savedInvoice.invoiceNumber} saved successfully.`,
      });

      if (andPush) {
        try {
          await apiRequest("POST", `/api/qb/push/${savedInvoice.id}`);
          qc.invalidateQueries({ queryKey: ["/api/invoices"] });
          toast({ title: "Pushed to QuickBooks", description: savedInvoice.invoiceNumber });
        } catch (e: any) {
          toast({ title: "QB push failed", description: e.message, variant: "destructive" });
        }
      }

      onSaved?.(savedInvoice);
      onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? `Edit Invoice ${invoice?.invoiceNumber}` : "New Invoice"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* 1. Client Info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Client Info
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs">Client Name *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Meridian Health Partners"
                  className="h-9 text-sm"
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs">Client Email</Label>
                <Input
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="ap@client.com"
                  type="email"
                  className="h-9 text-sm"
                  data-testid="input-client-email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Client Address</Label>
              <Textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="100 Corporate Ave, Suite 200, New York, NY 10001"
                className="text-sm resize-none"
                rows={2}
                data-testid="input-client-address"
              />
            </div>
          </div>

          <Separator />

          {/* 2. Candidate / Search */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Search Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Candidate Name</Label>
                <Input
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Sarah Chen"
                  className="h-9 text-sm"
                  data-testid="input-candidate-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Job Title</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Chief Financial Officer"
                  className="h-9 text-sm"
                  data-testid="input-job-title"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Base Salary ($)</Label>
                <Input
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="350000"
                  type="number"
                  className="h-9 text-sm"
                  data-testid="input-salary"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fee % (auto-creates line item)</Label>
                <Input
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  placeholder="25"
                  type="number"
                  className="h-9 text-sm"
                  data-testid="input-fee-percent"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 3. Line Items */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Line Items
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_64px_96px_80px_32px] gap-0 bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {lineItems.map((li, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_64px_96px_80px_32px] gap-0 border-t border-border px-2 py-1.5 items-center"
                  data-testid={`row-line-item-${idx}`}
                >
                  <Input
                    value={li.description}
                    onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                    placeholder="Description"
                    className="h-8 text-xs border-0 shadow-none focus-visible:ring-0 px-1"
                    data-testid={`input-li-description-${idx}`}
                  />
                  <Input
                    value={li.quantity === 0 ? "" : li.quantity}
                    onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                    type="number"
                    className="h-8 text-xs border-0 shadow-none focus-visible:ring-0 text-center px-1"
                    data-testid={`input-li-qty-${idx}`}
                  />
                  <Input
                    value={li.unitPrice === 0 ? "" : li.unitPrice}
                    onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                    type="number"
                    className="h-8 text-xs border-0 shadow-none focus-visible:ring-0 text-right px-1"
                    data-testid={`input-li-price-${idx}`}
                  />
                  <div className="text-xs text-right pr-2 font-medium tabular-nums">
                    {li.amount > 0 ? fmt(li.amount) : "—"}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removeLineItem(idx)}
                    disabled={lineItems.length === 1}
                    data-testid={`button-remove-line-item-${idx}`}
                  >
                    <X size={12} />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={addLineItem}
              data-testid="button-add-line-item"
            >
              <Plus size={12} />
              Add Line Item
            </Button>
          </div>

          <Separator />

          {/* 4. Financial Summary */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Financial Summary
            </p>
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <Input
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    type="number"
                    className="h-7 w-14 text-xs text-center"
                    data-testid="input-tax-percent"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <span className="font-medium tabular-nums text-sm">{fmt(taxAmount)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg tabular-nums">{fmt(total)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Terms</Label>
              <Select value={terms} onValueChange={setTerms}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-terms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* 5. Invoice Details */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Invoice Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice #</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-9 text-sm font-mono"
                  data-testid="input-invoice-number"
                />
              </div>
              <div /> {/* spacer */}
              <div className="space-y-1.5">
                <Label className="text-xs">Issue Date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-9 text-sm"
                  data-testid="input-issue-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-sm"
                  data-testid="input-due-date"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, payment instructions..."
                className="text-sm resize-none"
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            data-testid="button-cancel-invoice"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
            data-testid="button-save-invoice"
          >
            {saving && !pushAfterSave ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
            Save Invoice
          </Button>
          <Button
            size="sm"
            onClick={() => { setPushAfterSave(true); handleSave(true); }}
            disabled={saving}
            data-testid="button-save-push-invoice"
          >
            {saving && pushAfterSave ? <Loader2 size={12} className="animate-spin mr-1" /> : <Zap size={12} className="mr-1" />}
            Save & Push to QB
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Invoice Preview Sheet ─────────────────────────────────────────────────────

interface InvoicePreviewSheetProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onEdit: (inv: Invoice) => void;
  onPushQB: (inv: Invoice) => void;
  onMarkPaid: (inv: Invoice) => void;
  onVoid: (inv: Invoice) => void;
}

function InvoicePreviewSheet({
  open,
  invoice,
  onClose,
  onEdit,
  onPushQB,
  onMarkPaid,
  onVoid,
}: InvoicePreviewSheetProps) {
  const { toast } = useToast();

  if (!invoice) return null;

  let lineItemsParsed: LineItem[] = [];
  try {
    lineItemsParsed = JSON.parse(invoice.lineItems);
  } catch {}

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-semibold">Invoice Preview</SheetTitle>
        </SheetHeader>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onEdit(invoice)}
            data-testid="button-preview-edit"
          >
            <Edit2 size={12} />
            Edit
          </Button>
          {!invoice.qbInvoiceId && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onPushQB(invoice)}
              data-testid="button-preview-push-qb"
            >
              <Upload size={12} />
              Push to QB
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-green-600 dark:text-green-400"
              onClick={() => onMarkPaid(invoice)}
              data-testid="button-preview-mark-paid"
            >
              <CheckCircle2 size={12} />
              Mark Paid
            </Button>
          )}
          {invoice.status !== "void" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-destructive"
              onClick={() => onVoid(invoice)}
              data-testid="button-preview-void"
            >
              <X size={12} />
              Void
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => toast({ title: "PDF export", description: "PDF download coming soon." })}
            data-testid="button-preview-download-pdf"
          >
            <Download size={12} />
            PDF
          </Button>
        </div>

        {/* Invoice document */}
        <div className="rounded-lg border border-border bg-white dark:bg-card p-6 space-y-5 text-sm font-mono">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-base not-italic font-sans">THE HIRING ADVISORS</p>
              <p className="text-xs text-muted-foreground mt-0.5 not-italic font-sans">Executive Search</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="font-bold text-sm">INVOICE #{invoice.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground">Issue: {fmtDate(invoice.issueDate)}</p>
              <p className="text-xs text-muted-foreground">Due: {fmtDate(invoice.dueDate)}</p>
              {invoice.paidDate && (
                <p className="text-xs text-green-600 dark:text-green-400">Paid: {fmtDate(invoice.paidDate)}</p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Bill To</p>
            <p className="font-medium not-italic font-sans">{invoice.clientName}</p>
            {invoice.clientEmail && <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>}
            {invoice.clientAddress && (
              <p className="text-xs text-muted-foreground whitespace-pre-line">{invoice.clientAddress}</p>
            )}
          </div>

          {(invoice.candidateName || invoice.jobTitle) && (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Placement</p>
              <p className="text-xs not-italic font-sans">
                {invoice.candidateName}
                {invoice.candidateName && invoice.jobTitle ? " — " : ""}
                {invoice.jobTitle}
              </p>
            </div>
          )}

          {/* Line items */}
          <div className="border-t border-border pt-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Line Items</p>
            <div className="border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide">
                <span>Description</span>
                <span>Amount</span>
              </div>
              {lineItemsParsed.map((li, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] px-3 py-2 border-t border-border text-xs">
                  <span className="pr-4">{li.description}</span>
                  <span className="tabular-nums font-medium">{fmt(li.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tax ({invoice.taxPercent}%)</span>
              <span className="tabular-nums">{fmt(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-border pt-2 mt-1">
              <span>TOTAL</span>
              <span className="tabular-nums">{fmt(invoice.total)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                  <span>Amount Paid</span>
                  <span className="tabular-nums">({fmt(invoice.amountPaid)})</span>
                </div>
                <div className="flex justify-between font-semibold text-sm border-t border-border pt-1">
                  <span>AMOUNT DUE</span>
                  <span className="tabular-nums">{fmt(invoice.amountDue)}</span>
                </div>
              </>
            )}
          </div>

          {/* Terms & Notes */}
          {(invoice.terms || invoice.notes) && (
            <div className="border-t border-border pt-3 space-y-1">
              {invoice.terms && (
                <p className="text-xs"><span className="text-muted-foreground">Terms:</span> {invoice.terms}</p>
              )}
              {invoice.notes && (
                <p className="text-xs"><span className="text-muted-foreground">Notes:</span> {invoice.notes}</p>
              )}
            </div>
          )}

          {/* QB Status */}
          <div className="border-t border-border pt-3">
            {invoice.qbInvoiceId ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 size={12} />
                <span>Synced to QuickBooks ({invoice.qbInvoiceId})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle size={12} />
                <span>Not synced to QuickBooks</span>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Invoices() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── QB OAuth callback handling ─────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    const qbConnected = hash.includes("qb_connected=1");
    const qbErrorMatch = hash.match(/qb_error=([^&]+)/);

    if (qbConnected) {
      toast({ title: "QuickBooks connected!", description: "Your account is now linked." });
      window.location.hash = window.location.hash
        .replace(/[?&]?qb_connected=1/, "")
        .replace(/\?$/, "");
      qc.invalidateQueries({ queryKey: ["/api/qb/status"] });
    } else if (qbErrorMatch) {
      const errMsg = decodeURIComponent(qbErrorMatch[1]);
      toast({ title: "QuickBooks connection failed", description: errMsg, variant: "destructive" });
      window.location.hash = window.location.hash
        .replace(/[?&]?qb_error=[^&]+/, "")
        .replace(/\?$/, "");
    }
  }, []);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: rawInvoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: qbStatus } = useQuery<QBStatus>({
    queryKey: ["/api/qb/status"],
  });

  const invoices: Invoice[] = rawInvoices;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const pushQBMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest("POST", `/api/qb/push/${id}`);
      return r.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Pushed to QuickBooks", description: `Invoice synced: ${data?.qbInvoiceId ?? ""}` });
    },
    onError: (e: any) => toast({ title: "QB push failed", description: e.message, variant: "destructive" }),
  });

  const syncQBMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/qb/sync");
      return r.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/invoices"] });
      const synced = data?.synced ?? 0;
      const paid = data?.paid ?? 0;
      toast({
        title: "QB sync complete",
        description: `Synced ${synced} invoice${synced !== 1 ? "s" : ""} · ${paid} marked paid`,
      });
    },
    onError: (e: any) => toast({ title: "QB sync failed", description: e.message, variant: "destructive" }),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const r = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, {
        status: "paid",
        amountPaid: invoice.total,
        amountDue: 0,
        paidDate: today(),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice marked paid" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const voidMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const r = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, { status: "void" });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice voided" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  async function handleConnectQB() {
    try {
      const r = await apiRequest("GET", "/api/qb/connect");
      const { authUrl } = await r.json();
      window.location.href = authUrl;
    } catch (e: any) {
      toast({ title: "Could not initiate QB connection", description: e.message, variant: "destructive" });
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          inv.candidateName.toLowerCase().includes(q) ||
          inv.jobTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, statusFilter, search]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const nonVoid = invoices.filter((i) => i.status !== "void");
    const todayStr = today();
    const overdue = invoices.filter(
      (i) =>
        ["sent", "partial", "viewed"].includes(i.status) &&
        i.dueDate < todayStr
    );
    return {
      totalInvoiced: nonVoid.reduce((s, i) => s + i.total, 0),
      collected: invoices.reduce((s, i) => s + i.amountPaid, 0),
      outstanding: invoices
        .filter((i) => i.status !== "void")
        .reduce((s, i) => s + i.amountDue, 0),
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, i) => s + i.amountDue, 0),
    };
  }, [invoices]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openEdit(inv: Invoice) {
    setEditingInvoice(inv);
    setModalOpen(true);
  }

  function openPreview(inv: Invoice) {
    setPreviewInvoice(inv);
    setPreviewOpen(true);
  }

  function handleMarkPaid(inv: Invoice) {
    markPaidMutation.mutate(inv);
    setPreviewOpen(false);
  }

  function handleVoid(inv: Invoice) {
    voidMutation.mutate(inv);
    setPreviewOpen(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="font-display font-bold text-xl">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage placement invoices and sync with QuickBooks
        </p>
      </div>

      {/* QB Connection Banner */}
      {qbStatus && !qbStatus.connected && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" data-testid="banner-qb-connect">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">QB</span>
            </div>
            <div>
              <p className="font-medium text-sm text-blue-900 dark:text-blue-200">
                Connect QuickBooks to push invoices and sync payment status
              </p>
              <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                Automatically mark invoices paid when clients pay from their bank.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={handleConnectQB}
            data-testid="button-connect-qb"
          >
            <ExternalLink size={12} />
            Connect QuickBooks
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-card-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Total Invoiced</p>
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <FileText size={13} className="text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums" data-testid="kpi-total-invoiced">
              {fmt(kpis.totalInvoiced)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {invoices.filter((i) => i.status !== "void").length} invoices
            </p>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Collected</p>
              <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp size={13} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums text-green-600 dark:text-green-400" data-testid="kpi-collected">
              {fmt(kpis.collected)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {invoices.filter((i) => i.status === "paid").length} paid
            </p>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Outstanding</p>
              <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock size={13} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400" data-testid="kpi-outstanding">
              {fmt(kpis.outstanding)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {invoices.filter((i) => i.amountDue > 0 && i.status !== "void").length} pending
            </p>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Overdue</p>
              <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle size={13} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400" data-testid="kpi-overdue">
              {fmt(kpis.overdueAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {kpis.overdueCount} invoice{kpis.overdueCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setEditingInvoice(null); setModalOpen(true); }}
          data-testid="button-new-invoice"
        >
          <Plus size={13} />
          New Invoice
        </Button>

        {qbStatus?.connected ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => syncQBMutation.mutate()}
            disabled={syncQBMutation.isPending}
            data-testid="button-sync-qb"
          >
            {syncQBMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Sync QB
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={handleConnectQB}
            data-testid="button-connect-qb-topbar"
          >
            <ExternalLink size={12} />
            Connect QB
          </Button>
        )}

        {/* QB status pill */}
        {qbStatus?.connected && (
          <div className="flex items-center gap-1.5 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-3 py-1" data-testid="badge-qb-connected">
            <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-[8px]">QB</span>
            </span>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              {qbStatus.companyName || "Connected"}
            </span>
            <CheckCircle2 size={11} className="text-green-600 dark:text-green-400" />
          </div>
        )}

        <div className="flex-1" />

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] text-sm" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 w-[200px] text-sm"
            data-testid="input-search-invoices"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <Card className="border border-card-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Candidate / Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Issued</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Due</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Paid</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">QB</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoicesLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Loading invoices...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12" data-testid="text-no-invoices">
                    <FileText size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No invoices found</p>
                    {search || statusFilter !== "all" ? (
                      <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                    ) : (
                      <Button
                        size="sm"
                        className="mt-4 gap-1.5 text-xs"
                        onClick={() => { setEditingInvoice(null); setModalOpen(true); }}
                        data-testid="button-create-first-invoice"
                      >
                        <Plus size={12} />
                        Create your first invoice
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => openPreview(inv)}
                    data-testid={`row-invoice-${inv.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm truncate max-w-[140px]">{inv.clientName}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{inv.clientEmail}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm truncate max-w-[160px]">{inv.candidateName}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{inv.jobTitle}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground tabular-nums">
                      {fmtDate(inv.issueDate)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className={`text-sm tabular-nums ${
                          inv.dueDate < today() && ["sent", "partial", "viewed"].includes(inv.status)
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {fmtDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {fmt(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm text-muted-foreground hidden sm:table-cell">
                      {inv.amountPaid > 0 ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">{fmt(inv.amountPaid)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <QBBadge
                        invoice={inv}
                        onPush={() => pushQBMutation.mutate(inv.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Preview"
                          onClick={() => openPreview(inv)}
                          data-testid={`button-preview-${inv.id}`}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          onClick={() => openEdit(inv)}
                          data-testid={`button-edit-${inv.id}`}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-more-${inv.id}`}
                            >
                              <MoreHorizontal size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {!inv.qbInvoiceId && (
                              <DropdownMenuItem
                                onClick={() => pushQBMutation.mutate(inv.id)}
                                data-testid={`menu-push-qb-${inv.id}`}
                              >
                                <Upload size={13} className="mr-2" />
                                Push to QB
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "paid" && inv.status !== "void" && (
                              <DropdownMenuItem
                                onClick={() => markPaidMutation.mutate(inv)}
                                data-testid={`menu-mark-paid-${inv.id}`}
                              >
                                <CheckCircle2 size={13} className="mr-2 text-green-600" />
                                Mark Paid
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "void" && (
                              <DropdownMenuItem
                                onClick={() => voidMutation.mutate(inv)}
                                data-testid={`menu-void-${inv.id}`}
                              >
                                <X size={13} className="mr-2" />
                                Void Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteMutation.mutate(inv.id)}
                              data-testid={`menu-delete-${inv.id}`}
                            >
                              <Trash2 size={13} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
            <span className="tabular-nums font-medium">
              Total: {fmt(filtered.reduce((s, i) => s + i.total, 0))}
            </span>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <InvoiceFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingInvoice(null); }}
        invoice={editingInvoice}
        invoices={invoices}
      />

      {/* Preview Sheet */}
      <InvoicePreviewSheet
        open={previewOpen}
        invoice={previewInvoice}
        onClose={() => setPreviewOpen(false)}
        onEdit={(inv) => { setPreviewOpen(false); openEdit(inv); }}
        onPushQB={(inv) => pushQBMutation.mutate(inv.id)}
        onMarkPaid={handleMarkPaid}
        onVoid={handleVoid}
      />
    </div>
  );
}
