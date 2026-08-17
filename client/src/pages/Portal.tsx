import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Download,
  FileText,
  FileCheck2,
  FolderKanban,
  GraduationCap,
  Leaf,
  Loader2,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  Timer,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusStyle: Record<string, string> = {
  submitted: "pill pill-amber",
  reviewing: "pill pill-blue",
  approved: "pill pill-green",
  declined: "pill pill-red",
  completed: "pill pill-green",
  planning: "pill pill-stone",
  active: "pill pill-green",
  assigned: "pill pill-stone",
  assistance_needed: "pill pill-red",
  paused: "pill pill-amber",
  complete: "pill pill-green",
  at_risk: "pill pill-red",
  on_track: "pill pill-green",
  on_hold: "pill pill-amber",
  standard: "pill pill-stone",
  important: "pill pill-amber",
  urgent: "pill pill-red",
};

const pageMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/": { eyebrow: "Ecology Consulting", title: "Your work, in one place.", description: "Monitor your priorities, keep records current and stay connected with the team." },
  "/whs": { eyebrow: "Safety first", title: "WHS library", description: "Current safe work method statements, policies and field resources." },
  "/whs-drafts": { eyebrow: "WHS drafting", title: "WHS Draft Studio", description: "Prepare structured working drafts for competent review before use." },
  "/forms": { eyebrow: "EC forms", title: "Requests made simple", description: "Submit and track leave, training and equipment requests." },
  "/projects": { eyebrow: "My work", title: "Project tracker", description: "Keep your allocated projects moving with clear progress updates." },
  "/timesheets": { eyebrow: "Time tracking", title: "Timesheets", description: "Maintain an internal work log and access the formal timesheet system." },
  "/training": { eyebrow: "Capability", title: "Training and resources", description: "Complete required learning and retain your completion record." },
  "/noticeboard": { eyebrow: "Team communications", title: "Noticeboard", description: "Important updates from the Ecology Consulting team." },
  "/bosta": { eyebrow: "Report tools", title: "BOSTA Stage 1 memo", description: "Create a structured, review-ready preliminary assessment memo." },
  "/admin": { eyebrow: "Administration", title: "Control centre", description: "Manage people, content, requests and project allocations." },
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function inputDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function useAutoDraft<T extends Record<string, unknown>>(storageKey: string, initialValue: T) {
  const [seed] = useState(() => {
    if (typeof window === "undefined") return { value: initialValue, restored: false };
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
      const restored = Boolean(stored && Object.keys(stored).length);
      return { value: { ...initialValue, ...stored } as T, restored };
    } catch { return { value: initialValue, restored: false }; }
  });
  const [value, setValue] = useState<T>(seed.value);
  const [restored, setRestored] = useState(seed.restored);
  const [status, setStatus] = useState(seed.restored ? "Draft restored from this device" : "Draft saved locally");
  useEffect(() => {
    if (restored) {
      const restoredTimer = window.setTimeout(() => setRestored(false), 1800);
      return () => window.clearTimeout(restoredTimer);
    }
    setStatus("Saving draft…");
    const timer = window.setTimeout(() => { window.localStorage.setItem(storageKey, JSON.stringify(value)); setStatus("Draft saved locally"); }, 350);
    return () => window.clearTimeout(timer);
  }, [storageKey, value, restored]);
  return [value, setValue, status] as const;
}

function PageHeader({ location, action }: { location: string; action?: React.ReactNode }) {
  const meta = pageMeta[location] ?? pageMeta["/"];
  const [, setLocation] = useLocation();
  const isStaffSection = location !== "/" && location !== "/admin";
  const supportsAutoDraft = location === "/forms" || location === "/whs-drafts";
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{meta.eyebrow}</p>
        <h1>{meta.title}</h1>
        <p className="page-description">{meta.description}</p>
      </div>
      <div className="page-header-action">{supportsAutoDraft && <span className="autosave-note"><Check size={13} /> Draft auto-saves locally</span>}{isStaffSection && <Button size="sm" variant="outline" className="back-button" onClick={() => setLocation("/staff")}>← Back to Staff portal</Button>}{action}</div>
    </header>
  );
}

function LoadingBlock() {
  return <div className="loading-block"><Loader2 className="animate-spin" size={18} /> Loading the latest information…</div>;
}

function EmptyState({ title, copy, icon: Icon = Leaf }: { title: string; copy: string; icon?: typeof Leaf }) {
  return <div className="empty-state"><Icon size={22} /><strong>{title}</strong><span>{copy}</span></div>;
}

function StatusBadge({ value }: { value: string }) {
  return <span className={statusStyle[value] ?? "pill pill-stone"}>{value.replaceAll("_", " ")}</span>;
}

function ComplianceChart({ summary }: { summary?: { compliant: number; attention: number; overdue: number; openActions: number } }) {
  const metrics = [
    { label: "Compliant", value: summary?.compliant ?? 0, tone: "chart-green" },
    { label: "Attention", value: summary?.attention ?? 0, tone: "chart-amber" },
    { label: "Overdue", value: summary?.overdue ?? 0, tone: "chart-red" },
    { label: "Open actions", value: summary?.openActions ?? 0, tone: "chart-stone" },
  ];
  const highest = Math.max(1, ...metrics.map(metric => metric.value));
  return <div className="compliance-chart" aria-label="WHS compliance status chart">{metrics.map(metric => <div className="compliance-chart-row" key={metric.label}><span>{metric.label}</span><div><i className={metric.tone} style={{ width: `${Math.max(5, (metric.value / highest) * 100)}%` }} /></div><b>{metric.value}</b></div>)}</div>;
}

function ProjectTimeline({ rows }: { rows?: any[] }) {
  const activities = (rows ?? []).flatMap(row => (row.activities ?? []).map((activity: any) => ({ ...activity, projectNumber: row.project.projectNumber }))).filter(activity => activity.startDate && activity.endDate);
  if (!activities.length) return <p className="timeline-empty">Create dated activity rows to display the live project schedule.</p>;
  const starts = activities.map(activity => new Date(activity.startDate).getTime());
  const ends = activities.map(activity => new Date(activity.endDate).getTime());
  const first = Math.min(...starts);
  const last = Math.max(...ends);
  const span = Math.max(86_400_000, last - first);
  return <div className="project-timeline"><div className="timeline-axis"><span>{formatDate(new Date(first))}</span><span>{formatDate(new Date(last))}</span></div>{activities.slice(0, 6).map(activity => { const start = new Date(activity.startDate).getTime(); const end = new Date(activity.endDate).getTime(); return <div className="timeline-row" key={activity.id}><span>{activity.projectNumber} · {activity.title}</span><div><i className={`gantt-${activity.status}`} style={{ left: `${((start - first) / span) * 100}%`, width: `${Math.max(8, ((end - start) / span) * 100)}%` }} /></div></div>; })}</div>;
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

function RoleChoicePage({ user }: { user: { role: "user" | "admin"; name?: string | null } | null }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!user) return;
    const selected = window.sessionStorage.getItem("ec_selected_portal");
    if (!selected) return;
    window.sessionStorage.removeItem("ec_selected_portal");
    if (selected === "admin" && user.role === "admin") { setLocation("/admin"); return; }
    if (selected === "admin" && user.role !== "admin") toast.error("Administrator access has not been assigned to this account.");
    setLocation(user.role === "admin" ? "/admin" : "/staff");
  }, [setLocation, user]);
  const choosePortal = (portal: "staff" | "admin") => {
    window.sessionStorage.setItem("ec_selected_portal", portal);
    if (!user) { startLogin(); return; }
    if (portal === "admin" && user.role !== "admin") { toast.error("Administrator access has not been assigned to this account."); return; }
    setLocation(portal === "admin" ? "/admin" : "/staff");
  };
  return <main className="role-choice-page"><section className="role-choice-card"><div className="role-choice-brand"><span><Leaf size={22} /></span><div><strong>Ecology</strong><em>Consulting</em></div></div><p className="eyebrow">Secure portal access</p><h1>Choose your workspace</h1><p className="role-choice-copy">Select the portal that matches your role. Your account permissions are checked securely after sign-in.</p><div className="role-choice-grid"><button className="role-choice-option role-choice-staff" onClick={() => choosePortal("staff")}><span className="role-choice-icon"><ClipboardCheck size={22} /></span><span><strong>Staff Portal</strong><small>Projects, WHS, forms, time tracking and learning.</small></span><ChevronRight size={18} /></button><button className="role-choice-option role-choice-admin" onClick={() => choosePortal("admin")}><span className="role-choice-icon"><Wrench size={22} /></span><span><strong>Admin Portal</strong><small>Project allocation, compliance, approvals and oversight.</small></span><ChevronRight size={18} /></button></div>{user && <p className="role-choice-session">Signed in as {user.name || "team member"}.</p>}<p className="role-choice-note">Access is role-controlled; only authorised administrators can enter the Admin Portal.</p></section></main>;
}

export default function Portal() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const legacyStaffRoutes: Record<string, string> = { "/whs": "/staff/whs", "/whs-drafts": "/staff/whs-drafts", "/forms": "/staff/forms", "/projects": "/staff/projects", "/timesheets": "/staff/timesheets", "/training": "/staff/training", "/noticeboard": "/staff/noticeboard", "/bosta": "/staff/bosta" };
  useEffect(() => {
    if (!user) return;
    if (location === "/") return;
    if (legacyStaffRoutes[location]) { setLocation(user.role === "admin" ? "/admin" : legacyStaffRoutes[location]); return; }
    if (location.startsWith("/staff") && user.role === "admin") { setLocation("/admin"); return; }
    if (location === "/admin" && user.role !== "admin") setLocation("/staff");
  }, [location, setLocation, user]);
  const isAdminPortal = location === "/admin" && user?.role === "admin";
  const staffLocation = location === "/staff" ? "/" : location.replace(/^\/staff/, "") || "/";
  const content = useMemo(() => {
    if (isAdminPortal) return <AdminPage />;
    if (staffLocation === "/whs") return <WHSPage />;
    if (staffLocation === "/whs-drafts") return <WHSDraftsPage />;
    if (staffLocation === "/forms") return <FormsPage />;
    if (staffLocation === "/projects") return <ProjectsPage />;
    if (staffLocation === "/timesheets") return <TimesheetsPage />;
    if (staffLocation === "/training") return <TrainingPage />;
    if (staffLocation === "/noticeboard") return <NoticeboardPage />;
    if (staffLocation === "/bosta") return <BostaPage />;
    return <OverviewPage />;
  }, [isAdminPortal, staffLocation]);
  if (location === "/") return <RoleChoicePage user={user} />;
  return <DashboardLayout portalKind={isAdminPortal ? "admin" : "staff"}>{content}</DashboardLayout>;
}

function OverviewPage() {
  const dashboard = trpc.portal.dashboard.useQuery();
  const notifications = trpc.portal.notifications.listMine.useQuery();
  const markRead = trpc.portal.notifications.markRead.useMutation({ onSuccess: () => notifications.refetch() });
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = dashboard.data?.role === "admin";
  const data = dashboard.data as any;
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const workspaceCards = [
    { title: "WHS library", detail: "SWMS, policies and field resources", path: "/staff/whs", icon: ShieldCheck, tone: "moss" },
    { title: "WHS Draft Studio", detail: "Draft risk, SWMS and pre-mobilisation documents", path: "/staff/whs-drafts", icon: FileCheck2, tone: "forest" },
    { title: "EC forms", detail: "Leave, training and equipment requests", path: "/staff/forms", icon: ClipboardCheck, tone: "ochre" },
    { title: "My projects", detail: "Allocated work and progress updates", path: "/staff/projects", icon: FolderKanban, tone: "river" },
    { title: "Timesheets", detail: "Internal work log and formal timesheets", path: "/staff/timesheets", icon: Timer, tone: "fern" },
    { title: "Training", detail: "Learning modules, resources and quizzes", path: "/staff/training", icon: GraduationCap, tone: "stone" },
    { title: "Noticeboard", detail: "Team communications and acknowledgements", path: "/staff/noticeboard", icon: Megaphone, tone: "clay" },
    { title: "BOSTA Stage 1", detail: "Guided preliminary assessment memo", path: "/staff/bosta", icon: Sparkles, tone: "sky" },
  ];

  return <>
    <section className="staff-welcome">
      <div className="welcome-brand"><span className="welcome-leaf"><Leaf size={23} /></span><span><strong>Ecology</strong><em>Consulting</em></span></div>
      <div className="welcome-copy"><p className="eyebrow">Staff Portal</p><h1>Welcome back, {firstName}.</h1><p>Everything you need to prepare, coordinate and record your work is ready below.</p></div>
      <div className="welcome-status"><span /> Portal ready</div>
    </section>
    <section className="whs-forms-shortcut" aria-label="WHS forms and templates">
      <div className="whs-forms-shortcut-icon"><ClipboardCheck size={27} /></div>
      <div className="whs-forms-shortcut-copy"><p>WHS action centre</p><h2>WHS Forms &amp; Templates</h2><span>Complete risk assessments, SWMS, pre-mobilisation checks and psychosocial risk forms, then submit them for review.</span></div>
      <div className="whs-forms-shortcut-actions">
        <button className="whs-forms-shortcut-button" onClick={() => setLocation("/staff/whs-drafts")}><span>Complete a WHS form</span><ArrowUpRight size={19} /></button>
        <button className="whs-templates-shortcut-button" onClick={() => setLocation("/staff/whs")}><span>Browse templates</span><FileText size={17} /></button>
      </div>
    </section>
    <section className="workspace-launcher">
      <div className="launcher-heading"><div><p className="section-kicker">Your workspace</p><h2>What would you like to work on?</h2></div><span>Choose a workspace to continue</span></div>
      <div className="workspace-heading-grid">{workspaceCards.map(card => <button key={card.path} className={`workspace-heading workspace-${card.tone}`} onClick={() => setLocation(card.path)}><span className="workspace-icon"><card.icon size={17} /></span><span><strong>{card.title}</strong><small>{card.detail}</small></span><ChevronRight size={15} /></button>)}</div>
    </section>
    {!isAdmin && notifications.data?.length ? <section className="notification-strip"><div><CircleAlert size={17} /><span><strong>Project and WHS notifications</strong><small>{notifications.data.filter(item => !item.isRead).length} unread action{notifications.data.filter(item => !item.isRead).length === 1 ? "" : "s"}</small></span></div><div className="notification-items">{notifications.data.slice(0, 3).map(item => <button key={item.id} className={item.isRead ? "notification-read" : ""} onClick={() => { if (!item.isRead) markRead.mutate({ notificationId: item.id }); if (item.actionUrl) setLocation(item.actionUrl); }}><b>{item.title}</b><span>{item.message}</span></button>)}</div></section> : null}
    <PageHeader location="/" action={<div className="live-indicator"><span /> Live portal data</div>} />
    {dashboard.isLoading ? <LoadingBlock /> : <>
      <section className="metric-grid">
        {(data?.metrics ?? []).map((metric: any) => <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
          <p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.detail}</span>
        </article>)}
      </section>
      <section className="overview-grid">
        <article className="surface-card projects-surface">
          <div className="surface-heading"><div><p className="section-kicker">{isAdmin ? "Portal status" : "Allocated work"}</p><h2>{isAdmin ? "Operational overview" : "My active projects"}</h2></div><FolderKanban size={19} /></div>
          {isAdmin ? <p className="admin-overview-copy">Use the administration control centre to allocate staff, publish content and action incoming requests. Every action updates the portal records immediately.</p> : (data?.projects?.length ? <div className="mini-project-list">{data.projects.map((project: any) => <div className="mini-project" key={project.id}><div><strong>{project.projectNumber}</strong><span>{project.title}</span></div><div className="mini-progress"><span>{project.progress}%</span><i><b style={{ width: `${project.progress}%` }} /></i></div></div>)}</div> : <EmptyState title="No project allocations yet" copy="An administrator will add your assigned projects here." icon={FolderKanban} />)}
        </article>
        <article className="surface-card announcements-surface">
          <div className="surface-heading"><div><p className="section-kicker">Team updates</p><h2>Latest notices</h2></div><Megaphone size={19} /></div>
          {data?.announcements?.length ? <div className="notice-list">{data.announcements.slice(0, 3).map((announcement: any) => <div className="notice-row" key={announcement.id}><StatusBadge value={announcement.priority} /><div><strong>{announcement.title}</strong><p>{announcement.content}</p></div>{announcement.acknowledgementRequired && <span className={announcement.acknowledged ? "ack-dot acknowledged" : "ack-dot"}>{announcement.acknowledged ? <Check size={13} /> : <CircleAlert size={13} />}</span>}</div>)}</div> : <EmptyState title="No current notices" copy="Team announcements will appear here when published." icon={Megaphone} />}
        </article>
      </section>
      <section className="quick-links"><a href="/staff/whs"><ShieldCheck /> Review WHS documents <ChevronRight size={15} /></a><a href="/staff/whs-drafts"><FileCheck2 /> Draft WHS documentation <ChevronRight size={15} /></a><a href="/staff/bosta"><Sparkles /> Start a BOSTA memo <ChevronRight size={15} /></a></section>
    </>}
  </>;
}

function WHSPage() {
  const docs = trpc.portal.documents.list.useQuery();
  const [filter, setFilter] = useState("all");
  const items = ((docs.data ?? []) as any[]).filter(item => filter === "all" || item.category === filter);
  return <>
    <PageHeader location="/whs" />
    <div className="safety-strip"><ShieldCheck size={20} /><div><strong>Safety resources are current when published.</strong><span>Use the applicable SWMS and project-specific controls before attending site.</span></div></div>
    <div className="filter-row">{["all", "swms", "whs", "policy", "resource", "template"].map(option => <button className={filter === option ? "filter-chip selected" : "filter-chip"} onClick={() => setFilter(option)} key={option}>{option === "all" ? "All material" : option.toUpperCase()}</button>)}</div>
    {docs.isLoading ? <LoadingBlock /> : items.length ? <div className="document-grid">{items.map(item => <article className={`document-card ${item.category === "swms" ? "swms-card" : ""}`} key={item.id}><div className="document-icon">{item.category === "swms" ? <ShieldCheck /> : <FileText />}</div><div className="document-main"><StatusBadge value={item.category} /><h2>{item.title}</h2><p>{item.description || "Ecology Consulting published resource"}</p><small>Updated {formatDate(item.updatedAt)}</small></div><a className="document-download" href={item.storageUrl} target="_blank" rel="noreferrer"><Download size={16} /><span>Open</span></a></article>)}</div> : <EmptyState title="No published materials in this category" copy="The administrator can upload WHS documents, SWMS files, policies and resources from the control centre." icon={ShieldCheck} />}
  </>;
}

function WHSDraftsPage() {
  const utils = trpc.useUtils();
  const drafts = trpc.portal.whsDrafts.listMine.useQuery();
  const generate = trpc.portal.whsDrafts.generate.useMutation({ onSuccess: () => { utils.portal.whsDrafts.listMine.invalidate(); toast.success("Your working draft is ready for review."); }, onError: error => toast.error(error.message) });
  const submitForReview = trpc.portal.whsDrafts.submitForReview.useMutation({ onSuccess: () => { utils.portal.whsDrafts.listMine.invalidate(); toast.success("Draft marked ready for competent review."); }, onError: error => toast.error(error.message) });
  const [documentType, setDocumentType] = useState<"risk_assessment" | "premobilisation" | "swms" | "psychosocial">("risk_assessment");
  const [confirmed, setConfirmed] = useState(false);
  const [values, setValues, draftStatus] = useAutoDraft("ecology-whs-draft", { title: "", projectName: "", siteLocation: "", workActivity: "", teamAndRoles: "", knownHazards: "", existingControls: "", emergencyArrangements: "", consultationNotes: "", reviewDate: "" });
  const preview = generate.data?.draft as any;
  const labels = { risk_assessment: "Risk assessment", premobilisation: "Pre-mobilisation check", swms: "Safe Work Method Statement", psychosocial: "Psychosocial risk assessment" };
  const set = (key: keyof typeof values, value: string) => setValues({ ...values, [key]: value });
  const onSubmit = (event: React.FormEvent) => { event.preventDefault(); if (!confirmed) { toast.error("Confirm that the input is accurate before creating a working draft."); return; } generate.mutate({ documentType, ...values, projectName: values.projectName || undefined, siteLocation: values.siteLocation || undefined, teamAndRoles: values.teamAndRoles || undefined, knownHazards: values.knownHazards || undefined, existingControls: values.existingControls || undefined, emergencyArrangements: values.emergencyArrangements || undefined, consultationNotes: values.consultationNotes || undefined, reviewDate: values.reviewDate || undefined, workContext: undefined }); };
  return <><PageHeader location="/whs-drafts" /><div className="draft-safety-notice"><AlertCircle size={20} /><div><strong>Draft for competent review</strong><span>The assistant helps structure a working draft. It does not approve work, confirm a site is safe, or replace field verification, consultation, permits or Ecology Consulting’s WHS process.</span></div></div><div className="draft-studio-layout"><article className="surface-card draft-input-card"><div className="surface-heading"><div><p className="section-kicker">Guided draft</p><h2>Prepare a {labels[documentType].toLowerCase()}</h2></div><div className="autosave-note"><Check size={13} /> {draftStatus}</div></div><div className="draft-type-tabs">{(Object.keys(labels) as Array<keyof typeof labels>).map(type => <button type="button" key={type} onClick={() => setDocumentType(type)} className={documentType === type ? "active" : ""}>{type === "risk_assessment" ? "Risk" : type === "premobilisation" ? "Pre-mob" : type === "swms" ? "SWMS" : "Psychosocial"}</button>)}</div><form className="portal-form" onSubmit={onSubmit}><div className="two-fields"><div><Label>Draft title</Label><Input value={values.title} onChange={event => set("title", event.target.value)} placeholder={`${labels[documentType]} — project or activity`} required /></div><div><Label>Project name</Label><Input value={values.projectName} onChange={event => set("projectName", event.target.value)} placeholder="Optional project name" /></div></div><div className="two-fields"><div><Label>Site or workplace location</Label><Input value={values.siteLocation} onChange={event => set("siteLocation", event.target.value)} placeholder="Site, office or remote setting" /></div><div><Label>Review date</Label><Input value={values.reviewDate} onChange={event => set("reviewDate", event.target.value)} placeholder="Before mobilisation / date" /></div></div><div><Label>Work activity or assessment context</Label><Textarea value={values.workActivity} onChange={event => set("workActivity", event.target.value)} placeholder="Describe the task sequence or the work context being assessed." required /></div><div><Label>People, team and roles</Label><Textarea value={values.teamAndRoles} onChange={event => set("teamAndRoles", event.target.value)} placeholder="Field lead, workers, contractors and affected people." /></div><div><Label>Known hazards or psychosocial factors</Label><Textarea value={values.knownHazards} onChange={event => set("knownHazards", event.target.value)} placeholder="List known hazards. Leave unknown information blank for review prompts." /></div><div><Label>Existing verified controls</Label><Textarea value={values.existingControls} onChange={event => set("existingControls", event.target.value)} placeholder="Only include controls already confirmed." /></div><div className="two-fields"><div><Label>Emergency arrangements</Label><Textarea value={values.emergencyArrangements} onChange={event => set("emergencyArrangements", event.target.value)} placeholder="Confirmed ERP, contacts or check-in arrangements." /></div><div><Label>Consultation notes</Label><Textarea value={values.consultationNotes} onChange={event => set("consultationNotes", event.target.value)} placeholder="People consulted, toolbox talk or worker feedback." /></div></div><label className="draft-confirmation"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm this information is accurate to the best of my knowledge and will be checked before use.</label><Button className="ec-primary-button" disabled={generate.isPending}>{generate.isPending && <Loader2 className="animate-spin" />} Draft with WHS assistant</Button></form></article><article className="draft-preview-card">{preview ? <div className="whs-draft-paper"><div className="whs-draft-header"><div className="draft-logo"><Leaf size={19} /><span>Ecology<br /><em>Consulting</em></span></div><span>Draft for competent review</span></div><h2>{preview.title}</h2><div className="draft-control-grid"><span><b>Status</b>{preview.documentControl.status}</span><span><b>Project / work</b>{preview.documentControl.projectOrWork}</span><span><b>Location</b>{preview.documentControl.location}</span><span><b>Review</b>{preview.documentControl.reviewRequired}</span></div>{preview.sections?.map((section: any, index: number) => <section className="whs-output-section" key={index}><h3>{section.heading}</h3><p>{section.content}</p>{section.items?.length ? <ul>{section.items.map((item: string, itemIndex: number) => <li key={itemIndex}>{item}</li>)}</ul> : null}</section>)}{preview.riskRows?.length ? <section className="whs-output-section"><h3>Hazards and proposed controls</h3><div className="risk-output-list">{preview.riskRows.map((row: any, index: number) => <div key={index}><strong>{row.activityOrHazard}</strong><span>{row.peopleAtRisk}</span><ul>{row.controls.map((control: string, controlIndex: number) => <li key={controlIndex}>{control}</li>)}</ul><small>Residual-risk review: {row.residualRisk}</small></div>)}</div></section> : null}<section className="draft-gap-box"><h3>Confirm before approval</h3><ul>{preview.assumptionsAndGaps?.map((gap: string, index: number) => <li key={index}>{gap}</li>)}</ul></section><section className="draft-review-box"><h3>Review checklist</h3><ul>{preview.reviewChecklist?.map((item: string, index: number) => <li key={index}>{item}</li>)}</ul><p>{preview.urgentEscalationNote}</p></section>{generate.data?.id && <Button variant="outline" disabled={submitForReview.isPending} onClick={() => submitForReview.mutate({ draftId: generate.data!.id })}>Mark ready for review</Button>}</div> : <div className="draft-preview-placeholder"><FileCheck2 size={29} /><strong>Your structured draft will appear here.</strong><span>Complete the guided inputs to create a review-ready working draft that highlights what must still be confirmed.</span></div>}</article></div><section className="surface-card whs-draft-history"><div className="surface-heading"><div><p className="section-kicker">My WHS drafts</p><h2>Draft record</h2></div><FileCheck2 size={19} /></div>{drafts.isLoading ? <LoadingBlock /> : drafts.data?.length ? <div className="draft-history-list">{drafts.data.map(item => <div key={item.id}><div><strong>{item.title}</strong><span>{item.documentType.replaceAll("_", " ")} · Updated {formatDate(item.updatedAt)}</span></div><StatusBadge value={item.status} /></div>)}</div> : <EmptyState title="No WHS drafts yet" copy="Your generated risk, pre-mobilisation, SWMS and psychosocial drafts will be retained here." icon={FileCheck2} />}</section></>;
}

function FormsPage() {
  const utils = trpc.useUtils();
  const requests = trpc.portal.requests.listMine.useQuery();
  const submit = trpc.portal.requests.submit.useMutation({ onSuccess: () => { utils.portal.requests.listMine.invalidate(); utils.portal.dashboard.invalidate(); toast.success("Your request has been submitted for review."); }, onError: error => toast.error(error.message) });
  const [requestDraft, setRequestDraft, draftStatus] = useAutoDraft("ecology-request-draft", { type: "leave" as "leave" | "training_equipment", subject: "", details: "", startDate: "", endDate: "" });
  const { type, subject, details, startDate, endDate } = requestDraft;
  const setType = (type: "leave" | "training_equipment") => setRequestDraft({ ...requestDraft, type }); const setSubject = (subject: string) => setRequestDraft({ ...requestDraft, subject }); const setDetails = (details: string) => setRequestDraft({ ...requestDraft, details }); const setStartDate = (startDate: string) => setRequestDraft({ ...requestDraft, startDate }); const setEndDate = (endDate: string) => setRequestDraft({ ...requestDraft, endDate });
  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); submit.mutate({ requestType: type, subject, details, startDate: inputDate(startDate), endDate: inputDate(endDate) }); setRequestDraft({ type, subject: "", details: "", startDate: "", endDate: "" }); };
  return <>
    <PageHeader location="/forms" />
    <div className="forms-layout">
      <article className="surface-card request-form-card"><div className="surface-heading"><div><p className="section-kicker">New submission</p><h2>{type === "leave" ? "Leave request" : "Training / equipment request"}</h2></div><div className="autosave-note"><Check size={13} /> {draftStatus}</div></div>
        <div className="form-toggle"><button onClick={() => setType("leave")} className={type === "leave" ? "active" : ""}>Leave</button><button onClick={() => setType("training_equipment")} className={type === "training_equipment" ? "active" : ""}>Training / equipment</button></div>
        <form onSubmit={handleSubmit} className="portal-form"><div><Label htmlFor="request-subject">{type === "leave" ? "Leave type" : "What do you need?"}</Label><Input id="request-subject" value={subject} onChange={event => setSubject(event.target.value)} placeholder={type === "leave" ? "Annual leave, personal leave…" : "Course, certification or equipment"} required /></div>
          {type === "leave" && <div className="two-fields"><div><Label htmlFor="start-date">First day</Label><Input id="start-date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required /></div><div><Label htmlFor="end-date">Last day</Label><Input id="end-date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} required /></div></div>}
          <div><Label htmlFor="request-detail">Supporting details</Label><Textarea id="request-detail" value={details} onChange={event => setDetails(event.target.value)} placeholder={type === "leave" ? "Provide dates, cover arrangements or any relevant context." : "Provide the business purpose, preferred supplier or required specifications."} required /></div>
          <Button className="ec-primary-button" disabled={submit.isPending}>{submit.isPending && <Loader2 className="animate-spin" />} Submit for review</Button></form>
      </article>
      <article className="surface-card request-tracker"><div className="surface-heading"><div><p className="section-kicker">My record</p><h2>Submission tracking</h2></div><Clock3 size={19} /></div>{requests.isLoading ? <LoadingBlock /> : requests.data?.length ? <div className="tracking-list">{requests.data.map(request => <div className="tracking-row" key={request.id}><div className="tracking-icon">{request.requestType === "leave" ? <Timer /> : <GraduationCap />}</div><div><strong>{request.subject}</strong><span>{request.requestType === "leave" && request.startDate ? `${formatDate(request.startDate)} – ${formatDate(request.endDate)}` : "Training / equipment"}</span></div><StatusBadge value={request.status} /></div>)}</div> : <EmptyState title="No requests yet" copy="Your submitted forms will be visible here with their current status." icon={ClipboardCheck} />}</article>
    </div>
  </>;
}

function ProjectsPage() {
  const utils = trpc.useUtils();
  const execution = trpc.portal.projectExecution.listMine.useQuery();
  const updateStatus = trpc.portal.projectExecution.updateStatus.useMutation({ onSuccess: () => { utils.portal.projectExecution.listMine.invalidate(); utils.portal.notifications.listMine.invalidate(); toast.success("Senior has been notified of the activity update."); }, onError: error => toast.error(error.message) });
  const setStatus = (activityId: number, status: "active" | "assistance_needed" | "paused" | "complete") => { const note = status === "assistance_needed" ? window.prompt("What assistance do you need from the assigning Senior?") : status === "paused" ? window.prompt("Why is this activity paused?") : undefined; if ((status === "assistance_needed" || status === "paused") && !note?.trim()) return; updateStatus.mutate({ activityId, status, note: note ?? undefined }); };
  return <>
    <PageHeader location="/projects" />
    {execution.isLoading ? <LoadingBlock /> : execution.data?.length ? <div className="project-stack">{execution.data.map((row: any) => { const activity = row.activity; const project = row.project; const percent = activity.budgetHours ? Math.min(100, Math.round((row.loggedHours / Number(activity.budgetHours)) * 100)) : 0; return <article className="surface-card project-card allocation-card" key={row.assignment.id}><div className="project-card-top"><div><p className="project-number">{project.projectNumber} · {row.assignment.assignmentRole}</p><h2>{activity.title}</h2><p>{project.title} · {formatDate(activity.startDate)} – {formatDate(activity.endDate)}</p></div><StatusBadge value={row.assignment.status} /></div><div className="allocation-metrics"><span><b>{row.loggedHours.toFixed(2)} h</b><small>logged</small></span><span><b>{Number(activity.budgetHours).toFixed(2)} h</b><small>budget</small></span><span><b>{percent}%</b><small>budget used</small></span><span><b>{row.seniorName || "Assigning Senior"}</b><small>Senior</small></span></div><div className="project-progress"><div><span>Hours against activity budget</span><strong>{percent}%</strong></div><i><b style={{ width: `${percent}%` }} /></i></div><div className="task-brief"><p className="section-kicker">Task brief</p><p>{activity.taskBrief || activity.activityDescription || "The assigning Senior will add the brief for this allocation."}</p>{activity.seniorGuidance && <div><strong>Senior guidance</strong><p>{activity.seniorGuidance}</p></div>}{activity.exampleContent && <div><strong>Example content</strong><p>{activity.exampleContent}</p></div>}{row.steps?.length ? <ol>{row.steps.map((step: string, index: number) => <li key={index}>{step}</li>)}</ol> : null}{row.links?.length ? <div className="task-resources">{row.links.map((link: string) => <a href={link} target="_blank" rel="noreferrer" key={link}><ArrowUpRight size={13} />Reference link</a>)}</div> : null}{row.resources?.length ? <div className="task-resources">{row.resources.map((resource: string) => <span key={resource}><BookOpen size={13} />{resource}</span>)}</div> : null}</div><div className="allocation-actions"><Button size="sm" variant="outline" onClick={() => setStatus(activity.id, "active")} disabled={updateStatus.isPending}>Mark active</Button><Button size="sm" variant="outline" onClick={() => setStatus(activity.id, "assistance_needed")} disabled={updateStatus.isPending}>Need assistance</Button><Button size="sm" variant="outline" onClick={() => setStatus(activity.id, "paused")} disabled={updateStatus.isPending}>Pause</Button><Button size="sm" className="ec-primary-button" onClick={() => setStatus(activity.id, "complete")} disabled={updateStatus.isPending}>Complete</Button></div></article>; })}</div> : <EmptyState title="No detailed activity allocations yet" copy="Your assigning Senior can allocate planned activities with task briefs, budgets, resources and dates from the Admin Portal." icon={FolderKanban} />}
  </>;
}

function TimesheetsPage() {
  const utils = trpc.useUtils();
  const entries = trpc.portal.timesheets.listMine.useQuery();
  const projectQuery = trpc.portal.projects.listMine.useQuery();
  const create = trpc.portal.timesheets.create.useMutation({ onSuccess: () => { utils.portal.timesheets.listMine.invalidate(); utils.portal.dashboard.invalidate(); toast.success("Internal time entry saved."); }, onError: error => toast.error(error.message) });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [projectId, setProjectId] = useState(""); const [hours, setHours] = useState("7.5"); const [activity, setActivity] = useState(""); const [notes, setNotes] = useState("");
  const projects = ((projectQuery.data ?? []) as any[]).map(item => item.project ?? item);
  const submit = (event: React.FormEvent) => { event.preventDefault(); create.mutate({ entryDate: inputDate(date)!, projectId: projectId ? Number(projectId) : null, hours: Number(hours), activity, notes }); setActivity(""); setNotes(""); };
  return <>
    <PageHeader location="/timesheets" action={<a className="external-link" href="https://staff.ecologyconsulting.au/" target="_blank" rel="noreferrer">Open formal timesheet <ArrowUpRight size={15} /></a>} />
    <div className="timesheet-callout"><Timer /><div><strong>Internal self-tracking</strong><span>Use this work log to track activity. Submit your formal timesheet through the dedicated staff system.</span></div><a href="https://staff.ecologyconsulting.au/" target="_blank" rel="noreferrer">staff.ecologyconsulting.au <ArrowUpRight size={14} /></a></div>
    <div className="forms-layout"><article className="surface-card"><div className="surface-heading"><div><p className="section-kicker">New entry</p><h2>Log work time</h2></div><Timer size={19} /></div><form className="portal-form" onSubmit={submit}><div className="two-fields"><div><Label>Date</Label><Input type="date" value={date} onChange={event => setDate(event.target.value)} required /></div><div><Label>Hours</Label><Input type="number" step="0.25" min="0.25" max="24" value={hours} onChange={event => setHours(event.target.value)} required /></div></div><div><Label>Project (optional)</Label><select value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">General / internal work</option>{projects.map((project: any) => <option key={project.id} value={project.id}>{project.projectNumber} — {project.title}</option>)}</select></div><div><Label>Activity</Label><Input value={activity} onChange={event => setActivity(event.target.value)} placeholder="e.g. Site inspection and reporting" required /></div><div><Label>Notes</Label><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional detail for your personal work log." /></div><Button className="ec-primary-button" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />} Save time entry</Button></form></article><article className="surface-card"><div className="surface-heading"><div><p className="section-kicker">My recent log</p><h2>Time entries</h2></div><Clock3 size={19} /></div>{entries.isLoading ? <LoadingBlock /> : entries.data?.length ? <div className="entry-list">{entries.data.map((row: any) => <div className="entry-row" key={row.entry.id}><div><strong>{formatDate(row.entry.entryDate)}</strong><span>{row.projectNumber ? `${row.projectNumber} · ${row.projectTitle}` : "General / internal work"}</span></div><div><b>{row.entry.hours} h</b><span>{row.entry.activity}</span></div></div>)}</div> : <EmptyState title="No internal entries yet" copy="Add your first time entry using the form alongside." icon={Timer} />}</article></div>
  </>;
}

function TrainingPage() {
  const utils = trpc.useUtils();
  const training = trpc.portal.training.list.useQuery();
  const complete = trpc.portal.training.complete.useMutation({ onSuccess: result => { utils.portal.training.list.invalidate(); utils.portal.dashboard.invalidate(); toast.success(result.passed ? "Training completion recorded." : "Quiz saved. Review the material and try again."); }, onError: error => toast.error(error.message) });
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  return <><PageHeader location="/training" />{training.isLoading ? <LoadingBlock /> : training.data?.length ? <div className="training-grid">{training.data.map((module: any) => <article className="surface-card training-card" key={module.id}><div className="training-card-top"><div className="training-symbol"><GraduationCap /></div><StatusBadge value={module.completion?.passed ? "completed" : "standard"} /></div><p className="section-kicker">{module.category}</p><h2>{module.title}</h2><p>{module.description || "Ecology Consulting learning resource."}</p>{module.resourceUrl && <a className="resource-link" href={module.resourceUrl} target="_blank" rel="noreferrer"><BookOpen size={15} /> {module.resourceName || "Open resource"} <ArrowUpRight size={14} /></a>}{module.quiz?.length ? <div className="quiz-area">{module.quiz.map((question: any, index: number) => <fieldset key={index}><legend>{index + 1}. {question.question}</legend>{question.options.map((option: string) => <label className="quiz-option" key={option}><input type="radio" name={`${module.id}-${index}`} checked={(answers[module.id] ?? [])[index] === option} onChange={() => { const next = [...(answers[module.id] ?? [])]; next[index] = option; setAnswers({ ...answers, [module.id]: next }); }} />{option}</label>)}</fieldset>)}<Button size="sm" disabled={complete.isPending || (answers[module.id] ?? []).length !== module.quiz.length} onClick={() => complete.mutate({ moduleId: module.id, answers: answers[module.id] ?? [] })}>{module.completion ? "Reattempt quiz" : "Submit quiz"}</Button>{module.completion && <small className="completion-note"><CheckCircle2 size={14} /> Last score: {module.completion.score}%</small>}</div> : <Button size="sm" variant="outline" onClick={() => complete.mutate({ moduleId: module.id, answers: [] })}>{module.completion ? "Completed" : "Mark as complete"}</Button>}</article>)}</div> : <EmptyState title="Training content is being prepared" copy="Published training modules, resources and quizzes will appear here." icon={GraduationCap} />}</>;
}

function NoticeboardPage() {
  const utils = trpc.useUtils(); const notices = trpc.portal.announcements.list.useQuery();
  const acknowledge = trpc.portal.announcements.acknowledge.useMutation({ onSuccess: () => { utils.portal.announcements.list.invalidate(); utils.portal.dashboard.invalidate(); toast.success("Acknowledgement recorded."); }, onError: error => toast.error(error.message) });
  return <><PageHeader location="/noticeboard" />{notices.isLoading ? <LoadingBlock /> : notices.data?.length ? <div className="noticeboard-list">{notices.data.map((notice: any) => <article className={`surface-card full-notice notice-${notice.priority}`} key={notice.id}><div className="notice-main"><div className="notice-title-row"><StatusBadge value={notice.priority} /><span>{formatDate(notice.publishedAt)}</span></div><h2>{notice.title}</h2><p>{notice.content}</p></div>{notice.acknowledgementRequired && <div className="acknowledgement-panel">{notice.acknowledged ? <><CheckCircle2 /><span>Acknowledged</span></> : <Button size="sm" onClick={() => acknowledge.mutate({ announcementId: notice.id })} disabled={acknowledge.isPending}>Acknowledge message</Button>}</div>}</article>)}</div> : <EmptyState title="No notices have been published" copy="Team communications and important updates will be shown here." icon={Megaphone} />}</>;
}

function BostaPage() {
  const utils = trpc.useUtils();
  const templates = trpc.portal.documents.list.useQuery({ category: "template" });
  const generate = trpc.portal.bosta.generate.useMutation({ onSuccess: () => { utils.portal.bosta.listMine.invalidate(); toast.success("BOSTA Stage 1 memo generated for review."); }, onError: error => toast.error(error.message) });
  const [values, setValues] = useState({ projectName: "", projectNumber: "", clientName: "", locality: "", lga: "", minimumLotSize: "", clearingArea: "", bvMapOverlap: "no" as "yes" | "no" | "uncertain", significantImpact: "no" as "yes" | "no" | "possible", assessmentBasis: "", constraints: "", uncertainty: "", recommendation: "" });
  const memo = generate.data?.memo as any;
  const set = (field: keyof typeof values, value: string) => setValues({ ...values, [field]: value });
  const submit = (event: React.FormEvent) => { event.preventDefault(); generate.mutate({ ...values, minimumLotSize: values.minimumLotSize ? Number(values.minimumLotSize) : null, clearingArea: values.clearingArea ? Number(values.clearingArea) : null }); };
  return <><PageHeader location="/bosta" /><div className="bosta-layout"><article className="surface-card bosta-form"><div className="surface-heading"><div><p className="section-kicker">Guided assessment</p><h2>Build your Stage 1 brief</h2></div><Sparkles size={19} /></div><p className="form-intro">Use the preliminary details available. The generated memo must be reviewed by a suitably qualified Ecology Consulting team member.</p><form onSubmit={submit} className="portal-form"><div className="two-fields"><div><Label>Project name</Label><Input value={values.projectName} onChange={event => set("projectName", event.target.value)} required /></div><div><Label>EC project number</Label><Input value={values.projectNumber} onChange={event => set("projectNumber", event.target.value)} required /></div></div><div className="two-fields"><div><Label>Client</Label><Input value={values.clientName} onChange={event => set("clientName", event.target.value)} /></div><div><Label>Locality</Label><Input value={values.locality} onChange={event => set("locality", event.target.value)} /></div></div><div><Label>Local government area</Label><Input value={values.lga} onChange={event => set("lga", event.target.value)} /></div><div className="two-fields"><div><Label>Minimum lot size (ha)</Label><Input type="number" step="0.01" value={values.minimumLotSize} onChange={event => set("minimumLotSize", event.target.value)} /></div><div><Label>Proposed clearing (ha)</Label><Input type="number" step="0.01" value={values.clearingArea} onChange={event => set("clearingArea", event.target.value)} /></div></div><div className="two-fields"><div><Label>BV Map overlap</Label><select value={values.bvMapOverlap} onChange={event => set("bvMapOverlap", event.target.value)}><option value="no">No</option><option value="yes">Yes</option><option value="uncertain">Uncertain</option></select></div><div><Label>Potential significant impact</Label><select value={values.significantImpact} onChange={event => set("significantImpact", event.target.value)}><option value="no">No</option><option value="yes">Yes</option><option value="possible">Possible</option></select></div></div><div><Label>Assessment basis</Label><Textarea value={values.assessmentBasis} onChange={event => set("assessmentBasis", event.target.value)} placeholder="Desktop review, site inspection, mapping, relevant records…" /></div><div><Label>Known constraints</Label><Textarea value={values.constraints} onChange={event => set("constraints", event.target.value)} placeholder="Vegetation values, survey limitations, design status…" /></div><div><Label>Uncertainty and verification needs</Label><Textarea value={values.uncertainty} onChange={event => set("uncertainty", event.target.value)} placeholder="Identify outstanding field verification, mapping or footprint confirmation." /></div><div><Label>Recommendation (optional)</Label><Textarea value={values.recommendation} onChange={event => set("recommendation", event.target.value)} placeholder="Leave blank for a guided recommendation." /></div><Button className="ec-primary-button" disabled={generate.isPending}>{generate.isPending && <Loader2 className="animate-spin" />} Generate Stage 1 memo</Button></form></article><article className="memo-preview">{memo ? <div className="memo-paper"><div className="memo-brand"><span>Ecology</span><em>Consulting</em></div><p className="memo-type">BOSTA Stage 1 memo</p><h2>{memo.title}</h2><div className="memo-meta"><span>Project: {values.projectNumber}</span><span>Client: {values.clientName || "—"}</span><span>Location: {values.locality || "—"}, {values.lga || "—"}</span></div><MemoSection title="Basis of assessment" text={memo.body.assessmentBasis} /><MemoSection title="Trigger review" text={memo.body.clearing} /><div className="pathway-card"><p>Preliminary pathway</p><strong>{memo.pathway}</strong><span>{memo.pathwayReasons.length ? `Triggered by: ${memo.pathwayReasons.join(", ")}` : "No preliminary entry pathway identified from the supplied details."}</span></div><MemoSection title="Constraints and uncertainty" text={`${memo.body.constraints} ${memo.body.uncertainty}`} /><MemoSection title="Recommendation" text={memo.body.recommendation} /><footer>Prepared within the Ecology Consulting Staff Portal. Draft for internal professional review.</footer></div> : <div className="memo-placeholder"><FileText size={27} /><strong>Your branded memo preview will appear here.</strong><span>Complete the guided form to calculate the preliminary pathway and create a review-ready Stage 1 memo.</span></div>}<section className="template-library"><div><p className="section-kicker">Report template library</p><h3>Approved templates</h3></div>{templates.isLoading ? <Loader2 className="animate-spin" size={15} /> : templates.data?.length ? <div>{templates.data.map(item => <a key={item.id} href={item.storageUrl} target="_blank" rel="noreferrer"><FileText size={14} /><span>{item.title}</span><Download size={13} /></a>)}</div> : <p>Administrators can publish approved report templates from the control centre.</p>}</section></article></div></>;
}

function MemoSection({ title, text }: { title: string; text: string }) { return <section className="memo-section"><h3>{title}</h3><p>{text}</p></section>; }

function AdminPage() {
  const utils = trpc.useUtils();
  const users = trpc.portal.admin.users.useQuery(undefined, { enabled: true });
  const requests = trpc.portal.admin.requests.useQuery(undefined, { enabled: true });
  const projects = trpc.portal.projects.listMine.useQuery();
  const adminDocuments = trpc.portal.admin.documents.useQuery();
  const projectStatus = trpc.portal.admin.projectStatus.useQuery();
  const projectHealth = trpc.portal.admin.projectHealth.useQuery();
  const compliance = trpc.portal.admin.complianceDashboard.useQuery();
  const activity = trpc.portal.admin.activity.useQuery();
  const generatedMemos = trpc.portal.admin.bostaMemos.useQuery();
  const generatedWhsDrafts = trpc.portal.admin.whsDrafts.useQuery();
  const createCompliance = trpc.portal.admin.createComplianceItem.useMutation({ onSuccess: () => { utils.portal.admin.complianceDashboard.invalidate(); toast.success("Compliance register item created."); }, onError: error => toast.error(error.message) });
  const requestComplianceAction = trpc.portal.admin.requestComplianceAction.useMutation({ onSuccess: () => { utils.portal.admin.complianceDashboard.invalidate(); toast.success("WHS action request sent to staff."); }, onError: error => toast.error(error.message) });
  const upload = trpc.portal.admin.uploadDocument.useMutation({ onSuccess: () => { utils.portal.documents.list.invalidate(); utils.portal.dashboard.invalidate(); toast.success("Document uploaded and published."); }, onError: error => toast.error(error.message) });
  const createProject = trpc.portal.admin.createProject.useMutation({ onSuccess: () => { utils.portal.projects.listMine.invalidate(); utils.portal.dashboard.invalidate(); toast.success("Project created and staff allocated."); }, onError: error => toast.error(error.message) });
  const actionRequest = trpc.portal.admin.actionRequest.useMutation({ onSuccess: () => { utils.portal.admin.requests.invalidate(); utils.portal.dashboard.invalidate(); toast.success("Request status updated."); }, onError: error => toast.error(error.message) });
  const createTraining = trpc.portal.admin.createTraining.useMutation({ onSuccess: () => { utils.portal.training.list.invalidate(); toast.success("Training module published."); }, onError: error => toast.error(error.message) });
  const createAnnouncement = trpc.portal.admin.createAnnouncement.useMutation({ onSuccess: () => { utils.portal.announcements.list.invalidate(); utils.portal.dashboard.invalidate(); toast.success("Announcement published."); }, onError: error => toast.error(error.message) });
  const setRole = trpc.portal.admin.setUserRole.useMutation({ onSuccess: () => { utils.portal.admin.users.invalidate(); toast.success("User role updated."); }, onError: error => toast.error(error.message) });
  const reviewWhsDraft = trpc.portal.admin.reviewWhsDraft.useMutation({ onSuccess: () => { utils.portal.admin.whsDrafts.invalidate(); toast.success("WHS draft review status updated."); }, onError: error => toast.error(error.message) });
  const [file, setFile] = useState<File | null>(null); const [docTitle, setDocTitle] = useState(""); const [docCategory, setDocCategory] = useState<"whs" | "swms" | "policy" | "template" | "resource">("whs"); const [docDescription, setDocDescription] = useState("");
  const [project, setProject, projectDraftStatus] = useAutoDraft("ecology-admin-project-draft", { projectNumber: "", title: "", clientName: "", clientContactName: "", clientContactEmail: "", sharepointUrl: "", description: "", dueDate: "", startDate: "", endDate: "", budgetHours: "", activityTitle: "", activityBudgetHours: "", taskBrief: "", seniorGuidance: "", activityLines: "", activityEntries: [] as Array<{ title: string; budgetHours: string; startDate: string; endDate: string; taskBrief: string; seniorGuidance: string; exampleContent: string; steps: string; links: string; resources: string }>, staffIds: [] as number[] });
  const [training, setTraining] = useState({ title: "", description: "", category: "General", resourceName: "", resourceUrl: "", question: "", optionA: "", optionB: "", answer: "" }); const [trainingFile, setTrainingFile] = useState<File | null>(null);
  const [announcement, setAnnouncement] = useState({ title: "", content: "", priority: "standard" as "standard" | "important" | "urgent", acknowledgementRequired: false });
  const [complianceForm, setComplianceForm] = useState({ category: "Internal WHS Documents", requirement: "", reference: "", reviewFrequency: "Annual", nextReviewDate: "", status: "not_started" as "compliant" | "attention" | "overdue" | "not_started", riskLevel: "medium" as "low" | "medium" | "high" | "critical" });
  const [complianceAction, setComplianceAction] = useState({ itemId: "", staffId: "", actionType: "review" as "review" | "draft" | "complete" | "amend", instructions: "", dueDate: "" });
  const staffUsers = (users.data ?? []).filter(user => user.role === "user");
  const projectRows = ((projects.data ?? []) as any[]).map(item => item.project ?? item);
  const onUpload = async (event: React.FormEvent) => { event.preventDefault(); if (!file) return toast.error("Choose a document to upload."); try { const base64 = await fileToBase64(file); upload.mutate({ title: docTitle || file.name, description: docDescription, category: docCategory, fileName: file.name, contentType: file.type || "application/octet-stream", base64 }); setFile(null); setDocTitle(""); setDocDescription(""); } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed."); } };
  const onProject = (event: React.FormEvent) => { event.preventDefault(); const richActivities = project.activityEntries.filter(item => item.title || item.budgetHours || item.startDate || item.endDate); const invalid = richActivities.find(item => !item.title || !item.budgetHours || (item.startDate && item.endDate && item.startDate > item.endDate) || item.links.split(",").some(link => link.trim() && !/^https?:\/\//.test(link.trim()))); if (invalid) return toast.error("Each activity needs a title and budget. Check date order and use full http(s) links."); const extraActivities = richActivities.map(item => ({ title: item.title, description: project.description, budgetHours: Number(item.budgetHours), startDate: inputDate(item.startDate || project.startDate), endDate: inputDate(item.endDate || project.endDate), taskBrief: item.taskBrief, seniorGuidance: item.seniorGuidance, exampleContent: item.exampleContent || undefined, steps: item.steps.split("\n").map(step => step.trim()).filter(Boolean), links: item.links.split(",").map(link => link.trim()).filter(Boolean), resources: item.resources.split("\n").map(resource => resource.trim()).filter(Boolean), staffIds: project.staffIds })); const initialActivity = project.activityTitle ? [{ title: project.activityTitle, description: project.description, budgetHours: Number(project.activityBudgetHours || project.budgetHours || 0), startDate: inputDate(project.startDate), endDate: inputDate(project.endDate), taskBrief: project.taskBrief, seniorGuidance: project.seniorGuidance, exampleContent: undefined, steps: [], links: [], resources: [], staffIds: project.staffIds }] : []; createProject.mutate({ projectNumber: project.projectNumber, title: project.title, clientName: project.clientName, clientContactName: project.clientContactName, clientContactEmail: project.clientContactEmail, sharepointUrl: project.sharepointUrl, description: project.description, status: "planning", dueDate: inputDate(project.dueDate), startDate: inputDate(project.startDate), endDate: inputDate(project.endDate), budgetHours: project.budgetHours ? Number(project.budgetHours) : undefined, staffIds: project.staffIds, activities: [...initialActivity, ...extraActivities] }); setProject({ projectNumber: "", title: "", clientName: "", clientContactName: "", clientContactEmail: "", sharepointUrl: "", description: "", dueDate: "", startDate: "", endDate: "", budgetHours: "", activityTitle: "", activityBudgetHours: "", taskBrief: "", seniorGuidance: "", activityLines: "", activityEntries: [], staffIds: [] }); };
  const publishTraining = async (event: React.FormEvent) => { event.preventDefault(); try { const quiz = training.question ? [{ question: training.question, options: [training.optionA, training.optionB].filter(Boolean), answer: training.answer || training.optionA }] : []; const resourceFile = trainingFile ? { fileName: trainingFile.name, contentType: trainingFile.type || "application/octet-stream", base64: await fileToBase64(trainingFile) } : undefined; createTraining.mutate({ title: training.title, description: training.description, category: training.category, resourceName: training.resourceName || undefined, resourceUrl: training.resourceUrl || undefined, resourceFile, quiz }); setTraining({ title: "", description: "", category: "General", resourceName: "", resourceUrl: "", question: "", optionA: "", optionB: "", answer: "" }); setTrainingFile(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Training resource upload failed."); } };
  return <><PageHeader location="/admin" /><div className="admin-intro"><Wrench /><div><strong>Administrator workspace</strong><span>Changes are immediately reflected in the portal for the relevant staff members.</span></div></div><div className="admin-grid"><article className="surface-card admin-panel compliance-visual-panel"><div className="surface-heading"><div><p className="section-kicker">WHS Manager dashboard</p><h2>Compliance status chart</h2></div><ShieldCheck size={19} /></div>{compliance.isLoading ? <LoadingBlock /> : <ComplianceChart summary={compliance.data?.summary} />}</article><article className="surface-card admin-panel timeline-panel"><div className="surface-heading"><div><p className="section-kicker">Project health</p><h2>Activity schedule timeline</h2></div><CalendarDays size={19} /></div>{projectHealth.isLoading ? <LoadingBlock /> : <ProjectTimeline rows={projectHealth.data as any[]} />}</article>
    <article className="surface-card admin-panel oversight-panel"><div className="surface-heading"><div><p className="section-kicker">Project oversight</p><h2>Live project status</h2></div><FolderKanban size={19} /></div>{projectStatus.isLoading ? <LoadingBlock /> : projectStatus.data?.length ? <div className="oversight-list">{projectStatus.data.slice(0, 6).map(project => <div key={project.id}><div><strong>{project.projectNumber}</strong><span>{project.title}</span></div><span>{project.allocatedStaff} staff · {project.progress}%</span><StatusBadge value={project.status} /></div>)}</div> : <EmptyState title="No projects yet" copy="Create a project and allocate staff from the next panel." icon={FolderKanban} />}</article>
    <article className="surface-card admin-panel oversight-panel"><div className="surface-heading"><div><p className="section-kicker">Staff activity</p><h2>Internal time log</h2></div><Timer size={19} /></div>{activity.isLoading ? <LoadingBlock /> : activity.data?.length ? <div className="oversight-list">{activity.data.slice(0, 6).map((row: any) => <div key={row.entry.id}><div><strong>{row.staffName || row.staffEmail || "Staff member"}</strong><span>{row.projectNumber || "General work"} · {formatDate(row.entry.entryDate)}</span></div><span>{row.entry.hours} h</span><StatusBadge value="active" /></div>)}</div> : <EmptyState title="No internal time activity" copy="Staff self-tracking entries will appear here." icon={Timer} />}</article>
    <article className="surface-card admin-panel health-panel"><div className="surface-heading"><div><p className="section-kicker">Project health</p><h2>Budget, delivery and follow-up</h2></div><FolderKanban size={19} /></div>{projectHealth.isLoading ? <LoadingBlock /> : projectHealth.data?.length ? <div className="health-list">{projectHealth.data.slice(0, 6).map((row: any) => <div key={row.project.id}><div><strong>{row.project.projectNumber} · {row.project.title}</strong><span>{row.completion}% activities complete · {row.loggedHours.toFixed(1)} h / {row.budgetHours.toFixed(1)} h · {row.allocatedStaff} allocations</span><div className="mini-gantt">{row.activities.map((activity: any) => <i title={`${activity.title}: ${formatDate(activity.startDate)} – ${formatDate(activity.endDate)}`} key={activity.id} className={`gantt-${activity.status}`} />)}</div></div><StatusBadge value={row.health} /></div>)}</div> : <EmptyState title="No project activity plans" copy="Project health will calculate from activity dates, allocation status and budgeted hours." icon={FolderKanban} />}</article>
    <article className="surface-card admin-panel health-panel"><div className="surface-heading"><div><p className="section-kicker">WHS Manager dashboard</p><h2>Compliance monitoring</h2></div><ShieldCheck size={19} /></div>{compliance.isLoading ? <LoadingBlock /> : <><div className="compliance-summary"><span className="summary-green"><b>{compliance.data?.summary.compliant ?? 0}</b>compliant</span><span className="summary-amber"><b>{compliance.data?.summary.attention ?? 0}</b>attention</span><span className="summary-red"><b>{compliance.data?.summary.overdue ?? 0}</b>overdue</span><span className="summary-stone"><b>{compliance.data?.summary.openActions ?? 0}</b>open actions</span></div>{compliance.data?.items.length ? <div className="health-list">{compliance.data.items.slice(0, 5).map((item: any) => <div key={item.id}><div><strong>{item.requirement}</strong><span>{item.category} · {item.responsiblePosition || "Assign responsible staff"} · review {formatDate(item.nextReviewDate)}</span></div><StatusBadge value={item.status} /></div>)}</div> : <EmptyState title="No compliance items yet" copy="Add legal, document-review and audit items to begin colour-coded WHS monitoring." icon={ShieldCheck} />}</>}<details className="quiz-builder"><summary>Manage compliance register and staff actions</summary><form className="portal-form compact-form" onSubmit={event => { event.preventDefault(); createCompliance.mutate({ ...complianceForm, reference: complianceForm.reference || undefined, nextReviewDate: inputDate(complianceForm.nextReviewDate), responsibleUserId: null }); }}><div className="two-fields"><Input value={complianceForm.category} onChange={event => setComplianceForm({ ...complianceForm, category: event.target.value })} placeholder="Category" /><Input value={complianceForm.requirement} onChange={event => setComplianceForm({ ...complianceForm, requirement: event.target.value })} placeholder="Requirement" required /></div><div className="two-fields"><Input value={complianceForm.reference} onChange={event => setComplianceForm({ ...complianceForm, reference: event.target.value })} placeholder="Reference" /><Input type="date" value={complianceForm.nextReviewDate} onChange={event => setComplianceForm({ ...complianceForm, nextReviewDate: event.target.value })} /></div><div className="two-fields"><select value={complianceForm.status} onChange={event => setComplianceForm({ ...complianceForm, status: event.target.value as any })}><option value="not_started">Not started</option><option value="compliant">Compliant</option><option value="attention">Attention</option><option value="overdue">Overdue</option></select><select value={complianceForm.riskLevel} onChange={event => setComplianceForm({ ...complianceForm, riskLevel: event.target.value as any })}><option value="low">Low risk</option><option value="medium">Medium risk</option><option value="high">High risk</option><option value="critical">Critical risk</option></select></div><Button size="sm" className="ec-primary-button" disabled={createCompliance.isPending}>Add compliance item</Button></form>{compliance.data?.items.length && staffUsers.length ? <form className="portal-form compact-form" onSubmit={event => { event.preventDefault(); requestComplianceAction.mutate({ complianceItemId: Number(complianceAction.itemId), assignedTo: Number(complianceAction.staffId), actionType: complianceAction.actionType, instructions: complianceAction.instructions, dueDate: inputDate(complianceAction.dueDate) }); }}><div className="two-fields"><select value={complianceAction.itemId} onChange={event => setComplianceAction({ ...complianceAction, itemId: event.target.value })} required><option value="">Compliance item</option>{compliance.data.items.map((item: any) => <option key={item.id} value={item.id}>{item.requirement}</option>)}</select><select value={complianceAction.staffId} onChange={event => setComplianceAction({ ...complianceAction, staffId: event.target.value })} required><option value="">Assign staff</option>{staffUsers.map(member => <option key={member.id} value={member.id}>{member.name || member.email}</option>)}</select></div><div className="two-fields"><select value={complianceAction.actionType} onChange={event => setComplianceAction({ ...complianceAction, actionType: event.target.value as any })}><option value="review">Review</option><option value="draft">Draft</option><option value="complete">Complete</option><option value="amend">Amend</option></select><Input type="date" value={complianceAction.dueDate} onChange={event => setComplianceAction({ ...complianceAction, dueDate: event.target.value })} /></div><Textarea value={complianceAction.instructions} onChange={event => setComplianceAction({ ...complianceAction, instructions: event.target.value })} placeholder="Clear instructions for the staff action." required /><Button size="sm" variant="outline" disabled={requestComplianceAction.isPending}>Send WHS action request</Button></form> : null}</details></article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">Incoming work</p><h2>Requests to action</h2></div><ClipboardCheck size={19} /></div>{requests.isLoading ? <LoadingBlock /> : requests.data?.length ? <div className="admin-request-list">{requests.data.map((row: any) => <div className="admin-request" key={row.request.id}><div><strong>{row.request.subject}</strong><span>{row.requesterName || row.requesterEmail || "Staff member"} · {row.request.requestType.replaceAll("_", " ")}</span><p>{row.request.details}</p></div><div className="request-actions"><StatusBadge value={row.request.status} /><select defaultValue={row.request.status} onChange={event => actionRequest.mutate({ requestId: row.request.id, status: event.target.value as any })}>{["submitted", "reviewing", "approved", "declined", "completed"].map(status => <option key={status}>{status}</option>)}</select></div></div>)}</div> : <EmptyState title="No submitted requests" copy="New leave and training/equipment forms will appear here." icon={ClipboardCheck} />}</article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">WHS / templates / resources</p><h2>Publish a document</h2></div><Download size={19} /></div><form className="portal-form compact-form" onSubmit={onUpload}><div><Label>Title</Label><Input value={docTitle} onChange={event => setDocTitle(event.target.value)} placeholder="Use the file name if left blank" /></div><div className="two-fields"><div><Label>Category</Label><select value={docCategory} onChange={event => setDocCategory(event.target.value as any)}><option value="whs">WHS</option><option value="swms">SWMS</option><option value="policy">Policy</option><option value="template">Report template</option><option value="resource">Training resource</option></select></div><div><Label>File</Label><Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={event => setFile(event.target.files?.[0] ?? null)} required /></div></div><div><Label>Short description</Label><Textarea value={docDescription} onChange={event => setDocDescription(event.target.value)} placeholder="Purpose, version or usage guidance" /></div><Button className="ec-primary-button" disabled={upload.isPending}>{upload.isPending && <Loader2 className="animate-spin" />} Upload and publish</Button></form></article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">Project allocation</p><h2>Create a project</h2></div><div className="autosave-note"><Check size={13} /> {projectDraftStatus}</div></div><form className="portal-form compact-form" onSubmit={onProject}><div className="two-fields"><div><Label>Project number</Label><Input value={project.projectNumber} onChange={event => setProject({ ...project, projectNumber: event.target.value })} required /></div><div><Label>Project budget hours</Label><Input type="number" step="0.25" value={project.budgetHours} onChange={event => setProject({ ...project, budgetHours: event.target.value })} /></div></div><div><Label>Project title</Label><Input value={project.title} onChange={event => setProject({ ...project, title: event.target.value })} required /></div><div className="two-fields"><div><Label>Client</Label><Input value={project.clientName} onChange={event => setProject({ ...project, clientName: event.target.value })} /></div><div><Label>Client contact</Label><Input value={project.clientContactName} onChange={event => setProject({ ...project, clientContactName: event.target.value })} /></div></div><div className="two-fields"><div><Label>Client email</Label><Input type="email" value={project.clientContactEmail} onChange={event => setProject({ ...project, clientContactEmail: event.target.value })} /></div><div><Label>SharePoint project link</Label><Input type="url" value={project.sharepointUrl} onChange={event => setProject({ ...project, sharepointUrl: event.target.value })} /></div></div><div className="two-fields"><div><Label>Start date</Label><Input type="date" value={project.startDate} onChange={event => setProject({ ...project, startDate: event.target.value })} /></div><div><Label>End date</Label><Input type="date" value={project.endDate} onChange={event => setProject({ ...project, endDate: event.target.value })} /></div></div><div><Label>Project description</Label><Textarea value={project.description} onChange={event => setProject({ ...project, description: event.target.value })} /></div><details className="quiz-builder"><summary>Add initial activity breakdown and Senior brief</summary><div className="two-fields"><Input value={project.activityTitle} onChange={event => setProject({ ...project, activityTitle: event.target.value })} placeholder="Activity title" /><Input type="number" step="0.25" value={project.activityBudgetHours} onChange={event => setProject({ ...project, activityBudgetHours: event.target.value })} placeholder="Budget hours" /></div><Label>Task brief</Label><Textarea value={project.taskBrief} onChange={event => setProject({ ...project, taskBrief: event.target.value })} placeholder="Scope, expected output and activity guidance." /><Label>Senior guidance</Label><Textarea value={project.seniorGuidance} onChange={event => setProject({ ...project, seniorGuidance: event.target.value })} placeholder="Methods, quality expectations, steps, links and resources." /><Label>Additional activity rows</Label><Textarea value={project.activityLines} onChange={event => setProject({ ...project, activityLines: event.target.value })} placeholder="Title | hours | start | end | brief | guidance | example | steps separated by > | links comma-separated | resources comma-separated" /><small className="field-hint">Use one activity per line. Extra items support an example, ordered steps, hyperlinks and resources after the core title, hours and date fields.</small></details><div><Label>Allocate staff</Label><div className="staff-picker">{staffUsers.length ? staffUsers.map(member => <label key={member.id}><input type="checkbox" checked={project.staffIds.includes(member.id)} onChange={event => setProject({ ...project, staffIds: event.target.checked ? [...project.staffIds, member.id] : project.staffIds.filter(id => id !== member.id) })} />{member.name || member.email || `Staff #${member.id}`}</label>) : <span>No staff accounts have signed in yet.</span>}</div></div><Button className="ec-primary-button" disabled={createProject.isPending}>{createProject.isPending && <Loader2 className="animate-spin" />} Create and allocate</Button></form>{projectRows.length > 0 && <div className="admin-project-count"><CheckCircle2 size={15} /> {projectRows.length} project{projectRows.length === 1 ? "" : "s"} currently recorded.</div>}</article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">Learning and comms</p><h2>Publish training</h2></div><GraduationCap size={19} /></div><form className="portal-form compact-form" onSubmit={publishTraining}><div><Label>Module title</Label><Input value={training.title} onChange={event => setTraining({ ...training, title: event.target.value })} required /></div><div className="two-fields"><div><Label>Category</Label><Input value={training.category} onChange={event => setTraining({ ...training, category: event.target.value })} /></div><div><Label>Resource link</Label><Input type="url" value={training.resourceUrl} onChange={event => setTraining({ ...training, resourceUrl: event.target.value })} placeholder="Optional external link" /></div></div><div className="two-fields"><div><Label>Resource label</Label><Input value={training.resourceName} onChange={event => setTraining({ ...training, resourceName: event.target.value })} placeholder="e.g. Field Safety Handbook" /></div><div><Label>Upload resource</Label><Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={event => setTrainingFile(event.target.files?.[0] ?? null)} /></div></div><div><Label>Description</Label><Textarea value={training.description} onChange={event => setTraining({ ...training, description: event.target.value })} /></div><details className="quiz-builder"><summary>Add a two-option knowledge check</summary><Label>Question</Label><Input value={training.question} onChange={event => setTraining({ ...training, question: event.target.value })} /><div className="two-fields"><Input value={training.optionA} onChange={event => setTraining({ ...training, optionA: event.target.value })} placeholder="Option A" /><Input value={training.optionB} onChange={event => setTraining({ ...training, optionB: event.target.value })} placeholder="Option B" /></div><Label>Correct answer</Label><Input value={training.answer} onChange={event => setTraining({ ...training, answer: event.target.value })} placeholder="Must match an option" /></details><Button className="ec-primary-button" disabled={createTraining.isPending}>Publish training module</Button></form></article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">Noticeboard</p><h2>Post announcement</h2></div><Megaphone size={19} /></div><form className="portal-form compact-form" onSubmit={event => { event.preventDefault(); createAnnouncement.mutate({ ...announcement, expiresAt: null }); setAnnouncement({ title: "", content: "", priority: "standard", acknowledgementRequired: false }); }}><div><Label>Title</Label><Input value={announcement.title} onChange={event => setAnnouncement({ ...announcement, title: event.target.value })} required /></div><div><Label>Message</Label><Textarea value={announcement.content} onChange={event => setAnnouncement({ ...announcement, content: event.target.value })} required /></div><div className="two-fields"><div><Label>Priority</Label><select value={announcement.priority} onChange={event => setAnnouncement({ ...announcement, priority: event.target.value as any })}><option value="standard">Standard</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div><label className="check-field"><input type="checkbox" checked={announcement.acknowledgementRequired} onChange={event => setAnnouncement({ ...announcement, acknowledgementRequired: event.target.checked })} /> Require acknowledgement</label></div><Button className="ec-primary-button" disabled={createAnnouncement.isPending}>Publish announcement</Button></form></article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">Content oversight</p><h2>Published documents</h2></div><FileText size={19} /></div>{adminDocuments.isLoading ? <LoadingBlock /> : adminDocuments.data?.length ? <div className="oversight-list">{adminDocuments.data.slice(0, 6).map(item => <div key={item.id}><div><strong>{item.title}</strong><span>{item.fileName}</span></div><StatusBadge value={item.category} /><span>{formatDate(item.createdAt)}</span></div>)}</div> : <EmptyState title="No uploads yet" copy="WHS documents, SWMS files, templates and resources will be listed here." icon={FileText} />}</article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">Generated reports</p><h2>BOSTA Stage 1 memos</h2></div><Sparkles size={19} /></div>{generatedMemos.isLoading ? <LoadingBlock /> : generatedMemos.data?.length ? <div className="oversight-list">{generatedMemos.data.slice(0, 6).map((row: any) => <div key={row.memo.id}><div><strong>{row.memo.title}</strong><span>{row.authorName || row.authorEmail || "Staff member"} · {formatDate(row.memo.updatedAt)}</span></div><StatusBadge value={row.memo.status} /></div>)}</div> : <EmptyState title="No generated memos" copy="Draft BOSTA Stage 1 memos will be visible here for oversight." icon={Sparkles} />}</article>
    <article className="surface-card admin-panel"><div className="surface-heading"><div><p className="section-kicker">WHS draft review</p><h2>Working documents</h2></div><FileCheck2 size={19} /></div>{generatedWhsDrafts.isLoading ? <LoadingBlock /> : generatedWhsDrafts.data?.length ? <div className="oversight-list">{generatedWhsDrafts.data.slice(0, 8).map((row: any) => <div key={row.draft.id}><div><strong>{row.draft.title}</strong><span>{row.authorName || row.authorEmail || "Staff member"} · {row.draft.documentType.replaceAll("_", " ")}</span></div><StatusBadge value={row.draft.status} /><select aria-label={`Update ${row.draft.title} status`} defaultValue={row.draft.status} onChange={event => reviewWhsDraft.mutate({ draftId: row.draft.id, status: event.target.value as "draft" | "ready_for_review" | "approved" })}><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option></select></div>)}</div> : <EmptyState title="No WHS working drafts" copy="Staff drafts will be visible here for competent review and controlled status updates." icon={FileCheck2} />}</article>
    <article className="surface-card admin-panel people-panel"><div className="surface-heading"><div><p className="section-kicker">Access control</p><h2>Portal users</h2></div><ShieldCheck size={19} /></div>{users.isLoading ? <LoadingBlock /> : <div className="people-list">{users.data?.map(member => <div key={member.id} className="person-row"><div className="person-initial">{member.name?.[0]?.toUpperCase() ?? "E"}</div><div><strong>{member.name || "Unnamed user"}</strong><span>{member.email || "No email supplied"}</span></div><select value={member.role} onChange={event => setRole.mutate({ userId: member.id, role: event.target.value as "user" | "admin" })}><option value="user">Staff</option><option value="admin">Admin</option></select></div>)}</div>}</article>
  </div></>;
}
