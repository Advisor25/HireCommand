import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Job, Company, Contact } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  MapPin, Users, Clock, DollarSign, Briefcase, ChevronRight,
  Plus, Building2, User, Phone, Mail, Globe, Linkedin,
  Pencil, Trash2, Star, Calendar, Target, X, Download, Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const stages = [
  { key: "intake",     label: "Intake",     color: "bg-slate-400" },
  { key: "sourcing",   label: "Sourcing",   color: "bg-blue-500" },
  { key: "screening",  label: "Screening",  color: "bg-cyan-500" },
  { key: "interview",  label: "Interview",  color: "bg-amber-500" },
  { key: "offer",      label: "Offer",      color: "bg-purple-500" },
  { key: "placed",     label: "Placed",     color: "bg-green-500" },
];

const priorities = [
  { value: "high",   label: "High",   color: "text-red-500" },
  { value: "medium", label: "Medium", color: "text-amber-500" },
  { value: "low",    label: "Low",    color: "text-slate-400" },
];

// ─── Add Job Modal ────────────────────────────────────────────────────────────
function AddJobModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ["/api/contacts"] });

  const [form, setForm] = useState({
    title: "", company: "", location: "", stage: "intake",
    feePotential: "", description: "", requirements: "",
    salary: "", feePercent: "", priority: "medium", jobType: "full-time",
    openDate: new Date().toISOString().split("T")[0], targetCloseDate: "",
    notes: "", companyId: "", hiringManagerId: "",
  });

  const [newCompany, setNewCompany] = useState({
    show: false, name: "", website: "", industry: "",
    size: "", type: "PE-backed", peFirm: "", hqLocation: "", notes: "",
  });

  const [newContact, setNewContact] = useState({
    show: false, firstName: "", lastName: "", title: "",
    email: "", phone: "", mobile: "", linkedin: "", role: "hiring_manager", notes: "",
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/companies", data),
    onSuccess: (co: Company) => {
      qc.invalidateQueries({ queryKey: ["/api/companies"] });
      setForm(f => ({ ...f, company: co.name, companyId: String(co.id) }));
      setNewCompany(s => ({ ...s, show: false }));
      toast({ title: "Company added" });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/contacts", data),
    onSuccess: (ct: Contact) => {
      qc.invalidateQueries({ queryKey: ["/api/contacts"] });
      setForm(f => ({ ...f, hiringManagerId: String(ct.id) }));
      setNewContact(s => ({ ...s, show: false }));
      toast({ title: "Contact added" });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/jobs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job created" });
      onClose();
    },
  });

  const handleSaveJob = () => {
    if (!form.title || !form.company) {
      toast({ title: "Title and company are required", variant: "destructive" });
      return;
    }
    createJobMutation.mutate({
      ...form,
      candidateCount: 0,
      daysOpen: 0,
      companyId: form.companyId ? Number(form.companyId) : null,
      hiringManagerId: form.hiringManagerId ? Number(form.hiringManagerId) : null,
      feePercent: form.feePercent ? Number(form.feePercent) : 0,
      requirements: JSON.stringify(
        form.requirements.split("\n").map(r => r.trim()).filter(Boolean)
      ),
    });
  };

  const companyContacts = form.companyId
    ? contacts.filter(c => c.companyId === Number(form.companyId))
    : contacts;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">New Job / Search</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="job" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="job" className="flex-1">Job Details</TabsTrigger>
            <TabsTrigger value="company" className="flex-1">Company</TabsTrigger>
            <TabsTrigger value="contact" className="flex-1">Hiring Manager</TabsTrigger>
          </TabsList>

          {/* ── Job Details ── */}
          <TabsContent value="job" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Job Title *</Label>
                <Input placeholder="Chief Financial Officer" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input placeholder="New York, NY" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Job Type</Label>
                <Select value={form.jobType} onValueChange={v => setForm(f => ({ ...f, jobType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="contract">Contract / Interim</SelectItem>
                    <SelectItem value="fractional">Fractional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Salary Range</Label>
                <Input placeholder="$300K – $400K" value={form.salary}
                  onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fee % (search fee)</Label>
                <Input type="number" placeholder="25" value={form.feePercent}
                  onChange={e => setForm(f => ({ ...f, feePercent: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Est. Fee Value</Label>
                <Input placeholder="$125,000" value={form.feePotential}
                  onChange={e => setForm(f => ({ ...f, feePotential: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Open Date</Label>
                <Input type="date" value={form.openDate}
                  onChange={e => setForm(f => ({ ...f, openDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Target Close Date</Label>
                <Input type="date" value={form.targetCloseDate}
                  onChange={e => setForm(f => ({ ...f, targetCloseDate: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea rows={3} placeholder="Brief description of the role and company…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Requirements <span className="text-muted-foreground text-xs">(one per line)</span></Label>
                <Textarea rows={4} placeholder={"10+ years senior finance leadership\nPE-backed company experience\nM&A integration experience"}
                  value={form.requirements}
                  onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </TabsContent>

          {/* ── Company ── */}
          <TabsContent value="company" className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>Select Existing Company</Label>
              <Select value={form.companyId}
                onValueChange={v => {
                  const co = companies.find(c => String(c.id) === v);
                  setForm(f => ({ ...f, companyId: v, company: co?.name || f.company }));
                }}>
                <SelectTrigger>
                  <SelectValue placeholder="Search companies…" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} {c.type ? `· ${c.type}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company name if typed manually */}
            <div className="space-y-1">
              <Label>Or enter company name manually</Label>
              <Input placeholder="Acme Health Solutions (Thoma Bravo)" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value, companyId: "" }))} />
            </div>

            <div className="border-t pt-3">
              <Button type="button" variant="outline" size="sm"
                onClick={() => setNewCompany(s => ({ ...s, show: !s.show }))}>
                <Plus size={14} className="mr-1" /> Add New Company
              </Button>
            </div>

            {newCompany.show && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <p className="text-sm font-semibold">New Company</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>Company Name *</Label>
                    <Input value={newCompany.name}
                      onChange={e => setNewCompany(s => ({ ...s, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={newCompany.type} onValueChange={v => setNewCompany(s => ({ ...s, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PE-backed">PE-backed</SelectItem>
                        <SelectItem value="Public">Public</SelectItem>
                        <SelectItem value="Private">Private</SelectItem>
                        <SelectItem value="Non-profit">Non-profit</SelectItem>
                        <SelectItem value="Family Office">Family Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>PE Firm / Sponsor</Label>
                    <Input placeholder="Thoma Bravo" value={newCompany.peFirm}
                      onChange={e => setNewCompany(s => ({ ...s, peFirm: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Industry</Label>
                    <Input placeholder="Healthcare IT" value={newCompany.industry}
                      onChange={e => setNewCompany(s => ({ ...s, industry: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Company Size</Label>
                    <Input placeholder="50-250 employees" value={newCompany.size}
                      onChange={e => setNewCompany(s => ({ ...s, size: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>HQ Location</Label>
                    <Input placeholder="Chicago, IL" value={newCompany.hqLocation}
                      onChange={e => setNewCompany(s => ({ ...s, hqLocation: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Website</Label>
                    <Input placeholder="https://acme.com" value={newCompany.website}
                      onChange={e => setNewCompany(s => ({ ...s, website: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={newCompany.notes}
                      onChange={e => setNewCompany(s => ({ ...s, notes: e.target.value }))} />
                  </div>
                </div>
                <Button size="sm" onClick={() => createCompanyMutation.mutate(newCompany)}
                  disabled={!newCompany.name}>
                  Save Company
                </Button>
              </div>
            )}

            {/* Show selected company details */}
            {form.companyId && (() => {
              const co = companies.find(c => String(c.id) === form.companyId);
              if (!co) return null;
              return (
                <div className="border rounded-lg p-3 space-y-1.5 text-sm">
                  <p className="font-semibold">{co.name}</p>
                  {co.type && <p className="text-muted-foreground">{co.type}{co.peFirm ? ` · ${co.peFirm}` : ""}</p>}
                  {co.industry && <p className="text-muted-foreground">{co.industry} · {co.size}</p>}
                  {co.hqLocation && <div className="flex items-center gap-1 text-muted-foreground"><MapPin size={11} />{co.hqLocation}</div>}
                  {co.website && <div className="flex items-center gap-1 text-muted-foreground"><Globe size={11} />{co.website}</div>}
                </div>
              );
            })()}
          </TabsContent>

          {/* ── Hiring Manager ── */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>Select Existing Contact</Label>
              <Select value={form.hiringManagerId}
                onValueChange={v => setForm(f => ({ ...f, hiringManagerId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Search contacts…" />
                </SelectTrigger>
                <SelectContent>
                  {companyContacts.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.firstName} {c.lastName} · {c.title || c.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3">
              <Button type="button" variant="outline" size="sm"
                onClick={() => setNewContact(s => ({ ...s, show: !s.show }))}>
                <Plus size={14} className="mr-1" /> Add New Contact
              </Button>
            </div>

            {newContact.show && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <p className="text-sm font-semibold">New Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>First Name *</Label>
                    <Input value={newContact.firstName}
                      onChange={e => setNewContact(s => ({ ...s, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Last Name *</Label>
                    <Input value={newContact.lastName}
                      onChange={e => setNewContact(s => ({ ...s, lastName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input placeholder="CEO / Managing Partner" value={newContact.title}
                      onChange={e => setNewContact(s => ({ ...s, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select value={newContact.role} onValueChange={v => setNewContact(s => ({ ...s, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                        <SelectItem value="sponsor">PE Sponsor</SelectItem>
                        <SelectItem value="champion">Internal Champion</SelectItem>
                        <SelectItem value="recruiter">Internal Recruiter</SelectItem>
                        <SelectItem value="board">Board Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={newContact.email}
                      onChange={e => setNewContact(s => ({ ...s, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Direct Phone</Label>
                    <Input value={newContact.phone}
                      onChange={e => setNewContact(s => ({ ...s, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Mobile</Label>
                    <Input value={newContact.mobile}
                      onChange={e => setNewContact(s => ({ ...s, mobile: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>LinkedIn</Label>
                    <Input placeholder="linkedin.com/in/…" value={newContact.linkedin}
                      onChange={e => setNewContact(s => ({ ...s, linkedin: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={newContact.notes}
                      onChange={e => setNewContact(s => ({ ...s, notes: e.target.value }))} />
                  </div>
                </div>
                <Button size="sm"
                  onClick={() => createContactMutation.mutate({
                    ...newContact,
                    companyId: form.companyId ? Number(form.companyId) : null,
                    companyName: form.company,
                  })}
                  disabled={!newContact.firstName || !newContact.lastName}>
                  Save Contact
                </Button>
              </div>
            )}

            {/* Show selected contact */}
            {form.hiringManagerId && (() => {
              const ct = contacts.find(c => String(c.id) === form.hiringManagerId);
              if (!ct) return null;
              return (
                <div className="border rounded-lg p-3 space-y-1.5 text-sm">
                  <p className="font-semibold">{ct.firstName} {ct.lastName}</p>
                  {ct.title && <p className="text-muted-foreground">{ct.title}</p>}
                  {ct.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail size={11} />{ct.email}</div>}
                  {ct.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={11} />{ct.phone}</div>}
                  {ct.mobile && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={11} />{ct.mobile} (mobile)</div>}
                  {ct.linkedin && <div className="flex items-center gap-1 text-muted-foreground"><Linkedin size={11} />{ct.linkedin}</div>}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveJob} disabled={createJobMutation.isPending}>
            {createJobMutation.isPending ? "Saving…" : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Detail Sheet ─────────────────────────────────────────────────────────
function JobDetail({ job, onClose }: { job: Job; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ["/api/contacts"] });
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const hiringManager = job.hiringManagerId
    ? contacts.find(c => c.id === job.hiringManagerId)
    : null;
  const company = job.companyId
    ? companies.find(c => c.id === job.companyId)
    : null;

  const reqs: string[] = (() => {
    try { return JSON.parse(job.requirements || "[]"); } catch { return []; }
  })();

  const deleteJob = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/jobs/${job.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job deleted" });
      onClose();
    },
  });

  const priority = priorities.find(p => p.value === job.priority) || priorities[1];

  return (
    <div className="space-y-6">
      <SheetHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase size={18} className="text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-display leading-tight">{job.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">{job.company}</p>
              <div className="flex items-center gap-2 mt-1">
                {job.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={10} />{job.location}
                  </span>
                )}
                <span className={`text-xs font-medium ${priority.color}`}>
                  <Star size={10} className="inline mr-0.5" />{priority.label} Priority
                </span>
                {job.jobType && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{job.jobType}</Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
            onClick={() => { if (confirm("Delete this job?")) deleteJob.mutate(); }}>
            <Trash2 size={14} />
          </Button>
        </div>
      </SheetHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border border-card-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{job.candidateCount}</p>
            <p className="text-xs text-muted-foreground">Candidates</p>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{job.daysOpen}</p>
            <p className="text-xs text-muted-foreground">Days Open</p>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="p-3 text-center">
            <p className="text-sm font-bold text-primary">{job.feePotential || (job.feePercent ? `${job.feePercent}%` : "—")}</p>
            <p className="text-xs text-muted-foreground">Fee</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement details */}
      {(job.salary || job.openDate || job.targetCloseDate) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Engagement Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {job.salary && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign size={12} className="text-primary" />
                <span>{job.salary}</span>
              </div>
            )}
            {job.openDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar size={12} />
                <span>Opened {job.openDate}</span>
              </div>
            )}
            {job.targetCloseDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Target size={12} />
                <span>Target close {job.targetCloseDate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Info */}
      {company && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 size={14} className="text-primary" /> Company
          </h3>
          <div className="border rounded-lg p-3 space-y-1.5 text-sm">
            <p className="font-medium">{company.name}</p>
            {company.type && <p className="text-muted-foreground">{company.type}{company.peFirm ? ` · ${company.peFirm}` : ""}</p>}
            {company.industry && <p className="text-muted-foreground">{company.industry}{company.size ? ` · ${company.size}` : ""}</p>}
            {company.hqLocation && (
              <div className="flex items-center gap-1 text-muted-foreground"><MapPin size={11} />{company.hqLocation}</div>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-primary hover:underline">
                <Globe size={11} />{company.website}
              </a>
            )}
            {company.notes && <p className="text-muted-foreground text-xs mt-1">{company.notes}</p>}
          </div>
        </div>
      )}

      {/* Hiring Manager */}
      {hiringManager && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <User size={14} className="text-primary" /> Hiring Manager
          </h3>
          <div className="border rounded-lg p-3 space-y-1.5 text-sm">
            <p className="font-medium">{hiringManager.firstName} {hiringManager.lastName}</p>
            {hiringManager.title && <p className="text-muted-foreground">{hiringManager.title}</p>}
            {hiringManager.email && (
              <a href={`mailto:${hiringManager.email}`}
                className="flex items-center gap-1.5 text-primary hover:underline">
                <Mail size={11} />{hiringManager.email}
              </a>
            )}
            {hiringManager.phone && (
              <a href={`tel:${hiringManager.phone}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Phone size={11} />{hiringManager.phone}
              </a>
            )}
            {hiringManager.mobile && (
              <a href={`tel:${hiringManager.mobile}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Phone size={11} />{hiringManager.mobile} <span className="text-xs">(mobile)</span>
              </a>
            )}
            {hiringManager.linkedin && (
              <a href={`https://${hiringManager.linkedin.replace(/^https?:\/\//, "")}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline">
                <Linkedin size={11} />{hiringManager.linkedin}
              </a>
            )}
            {hiringManager.notes && (
              <p className="text-muted-foreground text-xs mt-1 border-t pt-1">{hiringManager.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
        </div>
      )}

      {/* Requirements */}
      {reqs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Requirements</h3>
          <ul className="space-y-1.5">
            {reqs.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ChevronRight size={12} className="mt-1 text-primary flex-shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {job.notes && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Notes</h3>
          <p className="text-sm text-muted-foreground">{job.notes}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button size="sm" className="flex-1">Add Candidates</Button>
        <Button size="sm" variant="outline" className="flex-1">Edit Job</Button>
      </div>
    </div>
  );
}

// ─── Main Jobs Page ───────────────────────────────────────────────────────────
export default function Jobs() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loxoSyncing, setLoxoSyncing] = useState(false);
  const { toast } = useToast();

  const { data: jobs = [], refetch: refetchJobs } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });

  async function handleLoxoSync() {
    setLoxoSyncing(true);
    toast({ title: "Syncing from Loxo…", description: "This may take a minute." });
    try {
      const baseUrl = window.location.origin;
      const es = new EventSource(`${baseUrl}/api/loxo/sync`);
      await new Promise<void>((resolve, reject) => {
        es.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.done) {
              toast({
                title: "Loxo sync complete",
                description: `${msg.candidatesSynced ?? 0} candidates · ${msg.jobsSynced ?? 0} jobs imported`,
              });
              refetchJobs();
              resolve();
            } else if (msg.error) {
              toast({ title: "Sync error", description: msg.error, variant: "destructive" });
              resolve();
            }
          } catch {}
        };
        es.onerror = () => { reject(new Error("Connection lost")); };
      });
      es.close();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setLoxoSyncing(false);
    }
  }

  const filtered = jobs.filter(j =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobs.length} active searches across your pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleLoxoSync}
            disabled={loxoSyncing}
          >
            {loxoSyncing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {loxoSyncing ? "Syncing…" : "Sync from Loxo"}
          </Button>
          <Button size="sm" onClick={() => setAddJobOpen(true)}>
            <Plus size={14} className="mr-1.5" /> Add Job
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search jobs…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {stages.map((stage) => {
          const stageJobs = filtered.filter((j) => j.stage === stage.key);
          return (
            <div key={stage.key} className="flex-shrink-0 w-[260px]">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stage.label}
                </span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">
                  {stageJobs.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {stageJobs.map((job) => {
                  const prio = priorities.find(p => p.value === job.priority);
                  return (
                    <Card
                      key={job.id}
                      className="border border-card-border hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <p className="text-sm font-semibold leading-tight">{job.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
                          </div>
                          {prio && (
                            <span className={`text-[10px] font-medium flex-shrink-0 ${prio.color}`}>
                              {prio.label}
                            </span>
                          )}
                        </div>
                        {job.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={10} /><span>{job.location}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users size={10} /><span>{job.candidateCount} candidates</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock size={10} /><span>{job.daysOpen}d</span>
                          </div>
                        </div>
                        {(job.feePotential || job.salary) && (
                          <div className="flex items-center gap-1 text-xs font-medium text-primary">
                            <DollarSign size={10} />
                            <span>{job.feePotential || job.salary}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {stageJobs.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border py-8 text-center">
                    <p className="text-xs text-muted-foreground">No jobs</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Detail Sheet */}
      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedJob && (
            <JobDetail job={selectedJob} onClose={() => setSelectedJob(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Job Modal */}
      <AddJobModal open={addJobOpen} onClose={() => setAddJobOpen(false)} />
    </div>
  );
}
