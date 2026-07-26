"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Plus, X, Link as LinkIcon, Paperclip,
  Trash2, Download, Upload, RotateCcw, Leaf, Users, Check, Pencil,
  PlayCircle, ClipboardList, GraduationCap, Calendar,
} from "lucide-react";
import { getItem, setItem } from "../lib/storage";

/* ---------------------------------------------------------------
   Ecology Consulting — Onboarding Workbook
   The workbook is the face of the app; Learning & Development
   Modules live as one expandable item within it.
   Brand: Forest Green / Steel Blue / Warm Gold, Quicksand + Newsreader
----------------------------------------------------------------- */

const COLORS = {
  forest: "#1E3B2C",
  forestLight: "#2F5A40",
  steel: "#3E6484",
  steelLight: "#6E93B4",
  gold: "#C79A45",
  goldLight: "#E4C97A",
  rust: "#B4451E",
  paper: "#F6F2E8",
  paperDim: "#EFE9D9",
  ink: "#26241D",
  inkSoft: "#5C5A4E",
  line: "#DED4BA",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "ecology-onboarding-library-v1";

/* ---------------------------------------------------------------
   Seed content
----------------------------------------------------------------- */

function mkItem(name, extra = {}) {
  return { id: uid(), name, done: false, date: "", notes: "", links: [], ...extra };
}

function seedOnboardingSections() {
  const sec = (title, items) => ({ id: uid(), title, items: items.map((n) => mkItem(n)) });
  return [
    sec("Employee Details", ["Employee Name", "Position", "Manager", "Buddy / Mentor", "Start Date"]),
    sec("Pre-Commencement Checklist", [
      "Employment contract", "Position description", "Welcome email", "Laptop issued",
      "Microsoft 365 access", "Payroll setup",
    ]),
    sec("Day 1 — People & Culture", ["Meet Manager", "Meet Team", "Office tour", "Company values", "Buddy introduced"]),
    sec("Day 1 — IT & Systems", ["Laptop setup", "Email", "Teams", "SharePoint", "Phone"]),
    sec("Day 1 — WHS", ["WHS induction", "Emergency procedures", "Incident reporting", "Hazard reporting", "PPE issued"]),
    sec("Week 1", ["Project systems", "Quality Management", "Policies", "Timesheets", "Training plan"]),
    sec("Key Contacts", ["HR", "IT", "Finance", "WHS", "Manager", "Mentor"]),
    sec("Important Links", ["SharePoint", "Policies", "WHS Portal", "Training Register", "Timesheets"]),
    sec("30 / 60 / 90 Day Reviews", ["Manager feedback", "Employee feedback", "Training needs", "Actions"]),
  ];
}

function seedModules() {
  const mk = (title, sme, subs) => ({
    id: uid(),
    title,
    sme,
    subheadings: subs.map((s) => ({
      id: uid(),
      title: typeof s === "string" ? s : s.title,
      notes: "",
      links: typeof s === "string" ? [] : s.links || [],
      attachments: [],
      done: false,
    })),
  });

  return [
    mk("Company Systems, Processes & Quality Management", "Tony Webster & Aaron Dooley", [
      "Company Structure & Services", "Organisational Roles & Responsibilities", "SharePoint & Teams",
      "Project Folder Structure", "Timesheets & Chargeability", "Quality Assurance & Quality Control",
      "Internal Review Processes", "Company SOPs & Templates",
      {
        title: "WHS Systems & Forms",
        links: [{ id: uid(), type: "video", label: "Navigating our WHS forms & processes (add link)", url: "" }],
      },
      "Data Management Standards", "Document Control", "Professional Expectations",
    ]),
    mk("Environmental Legislation & Approval Pathways (NSW & ACT)", "Simon & Emily", [
      "Introduction to Environmental Assessment", "Role of the Ecologist in the Assessment Process",
      "Environmental Assessment Workflow", "NSW Legislative Framework", "ACT Legislative Framework",
      "Commonwealth Legislative Framework", "Regulatory Authorities", "When to Engage Regulatory Agencies",
      "Development Applications (DA)", "Review of Environmental Factors (REF)",
      "Biodiversity Assessment Reports (BAR)", "Biodiversity Development Assessment Reports (BDAR)",
      "Environmental Significance Opinions (ESO)", "Environmental Impact Statements (EIS)",
      "Biodiversity Sensitive Urban Design (BSUD)", "EPBC Referrals", "Common Ecological Assessment Triggers",
      "Project Scoping & Constraint Identification", "Desktop Assessments",
      "Determining Assessment Requirements", "Determining Approval Pathways", "Reporting Requirements",
      "Ecologist Responsibilities",
    ]),
    mk("Flora & Habitat Surveys — Fundamentals", "Emily", [
      "Introduction to Flora Surveys", "Flora Survey Objectives", "Vegetation Communities",
      "Flora Survey Methodologies", "Vegetation Condition Assessment", "Habitat Assessment Fundamentals",
      "Threatened Flora Considerations", "BAM Fundamentals", "BAM Plot Establishment",
      "Species Identification Resources", "GPS & Mapping Requirements", "Photography Standards",
      "Field Notes & Data Collection Standards", "Survey123 Requirements", "Data Quality Requirements",
      "Common Field Errors", "Introduction to Flora Reporting",
    ]),
    mk("Fauna Surveys — Fundamentals", "Gerard", [
      "Introduction to Fauna Surveys", "Fauna Survey Objectives", "General Survey Methodologies",
      "Habitat Assessment Fundamentals", "Threatened Species Considerations", "Hollow Bearing Trees",
      "Fallen Timber Habitat", "Aquatic Habitat Features", "Opportunistic Records",
      "Secondary Evidence Recording", "Bird Survey Fundamentals", "Mammal Survey Fundamentals",
      "Reptile Survey Fundamentals", "GPS & Mapping Requirements", "Photography Standards",
      "Field Notes & Data Collection Standards", "Survey123 Requirements", "Data Quality Requirements",
      "Introduction to Fauna Reporting",
    ]),
    mk("Ecological Reporting Fundamentals", "Simon", [
      "Types of Ecological Reports", "Report Structure & Formatting", "Company Report Templates",
      "Legislative Context Sections", "Assessment Methodologies", "Presenting Results",
      "Impact Assessments", "Mitigation Measures", "Figures & Tables", "Mapping Requirements",
      "Appendices", "Referencing Standards", "Quality Assurance Requirements", "Internal Review Processes",
      "Common Reporting Errors", "Client Deliverables",
    ]),
    mk("GIS Requests, Mapping & Spatial Data Fundamentals", "Shu", [
      "Introduction to GIS in Ecological Consulting", "GIS Applications in Ecological Consulting",
      "Common Mapping Products", "Understanding Mapping Requests", "Defining Mapping Scope of Works",
      "GIS Request Procedure — Step 1: Mapping Request Details",
      "GIS Request Procedure — Step 2: Submit the Request",
      "GIS Request Procedure — Step 3: Review and Feedback",
      "GIS Request Procedure — Step 4: Allocation and Scheduling",
      "GIS Request Procedure — Step 5: Confirmation", "GIS Deliverables", "Spatial Data Standards",
      "GPS Data Requirements", "Data Accuracy Requirements", "File Naming Conventions",
      "Working with the GIS Team", "Reviewing Mapping Outputs", "GIS Inputs for Ecological Assessments",
      "Mapping Requirements for Ecological Reports",
    ]),
    mk("Project Delivery & Business Operations Fundamentals", "Aaron Dooley & Tony Webster", [
      "Introduction to Ecological Consulting", "Ecology Consulting Business Model", "Project Lifecycle",
      "Proposal to Project Delivery Process", "Scope Management", "Project Budgets",
      "Chargeability & Utilisation", "Resource Planning", "Scheduling & Deliverables", "Project Risks",
      "Variations & Additional Scope", "Client Communication", "Stakeholder Management",
      "Business Development Fundamentals", "Understanding Financial Performance", "Project Close-Out",
      "Lessons Learned", "Professional Development Expectations",
    ]),
  ];
}

function seedData() {
  return {
    onboarding: { sections: seedOnboardingSections() },
    months: [{ id: uid(), name: "Month 1", modules: seedModules() }],
  };
}

/* ---------------------------------------------------------------
   Small shared pieces
----------------------------------------------------------------- */

function GrowthRing({ pct, size = 40, stroke = 4.5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.line} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.gold} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: "Quicksand, sans-serif", fontSize: size * 0.3, fontWeight: 700, fill: COLORS.forest }}>
        {Math.round(pct)}
      </text>
    </svg>
  );
}

const pctOf = (items, pred) => (items.length ? (items.filter(pred).length / items.length) * 100 : 0);
const moduleProgress = (mod) => pctOf(mod.subheadings, (s) => s.done);
const monthProgress = (month) => pctOf(month.modules.flatMap((m) => m.subheadings), (s) => s.done);
const sectionProgress = (section) => pctOf(section.items, (i) => i.done);
const onboardingProgress = (onboarding) => pctOf(onboarding.sections.flatMap((s) => s.items), (i) => i.done);

const iconBtnGhost = {
  background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer",
  padding: 3, display: "flex", alignItems: "center",
};
const sidebarAddBtn = {
  display: "flex", alignItems: "center", gap: 6, background: "none",
  border: `1px dashed rgba(255,255,255,0.25)`, color: "rgba(255,255,255,0.75)",
  borderRadius: 7, padding: "6px 10px", fontSize: 12.5, fontFamily: "Quicksand, sans-serif",
  cursor: "pointer", width: "100%", marginTop: 4,
};
const footerBtn = {
  display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.08)",
  border: "none", color: COLORS.paper, borderRadius: 7, padding: "7px 9px",
  fontSize: 11.5, fontFamily: "Quicksand, sans-serif", cursor: "pointer", flex: 1, justifyContent: "center",
};
const h1Style = {
  fontFamily: "Quicksand, sans-serif", fontWeight: 700, fontSize: 23, color: COLORS.forest,
  cursor: "pointer", lineHeight: 1.25,
};
const rowChipStyle = {
  display: "flex", alignItems: "center", gap: 7, background: COLORS.paperDim,
  borderRadius: 6, padding: "5px 8px", marginBottom: 4,
};
const chipXStyle = { background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", display: "flex" };
const miniInput = {
  border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "5px 8px", fontSize: 12.5,
  fontFamily: "Quicksand, sans-serif", flex: 1,
};
const miniAddBtn = {
  background: COLORS.forest, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px",
  fontSize: 12.5, fontFamily: "Quicksand, sans-serif", fontWeight: 600, cursor: "pointer",
};
const miniCancelBtn = { background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", padding: "0 4px" };
const addSmallBtn = {
  display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
  color: COLORS.steel, fontFamily: "Quicksand, sans-serif", fontSize: 12, fontWeight: 600,
  cursor: "pointer", padding: "3px 0", marginTop: 2,
};

/* A reusable "add a link" row that can add either a hyperlink or a video link */
function LinkAdder({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("link");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const submit = () => {
    if (!label.trim() || !url.trim()) return;
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    onAdd({ id: uid(), type, label: label.trim(), url: u });
    setLabel(""); setUrl(""); setAdding(false); setType("link");
  };

  if (!adding) {
    return (
      <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
        <button onClick={() => { setType("link"); setAdding(true); }} style={addSmallBtn}><Plus size={11} /> Add hyperlink</button>
        <button onClick={() => { setType("video"); setAdding(true); }} style={addSmallBtn}><PlayCircle size={12} /> Add video link</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
      {type === "video" ? <PlayCircle size={14} color={COLORS.gold} /> : <LinkIcon size={14} color={COLORS.steel} />}
      <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} style={miniInput} />
      <input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} style={{ ...miniInput, flex: 1.4 }}
        onKeyDown={(e) => e.key === "Enter" && submit()} />
      <button onClick={submit} style={miniAddBtn}>Add</button>
      <button onClick={() => setAdding(false)} style={miniCancelBtn}><X size={13} /></button>
    </div>
  );
}

function LinkRow({ link, onEdit, onRemove }) {
  const missing = !link.url;
  const edit = () => {
    const label = window.prompt("Label", link.label) ?? link.label;
    let url = window.prompt("URL", link.url) ?? link.url;
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    onEdit({ ...link, label, url });
  };
  return (
    <div style={{ ...rowChipStyle, background: missing ? "#FBEFE6" : COLORS.paperDim }}>
      {link.type === "video" ? <PlayCircle size={12} color={COLORS.gold} /> : <LinkIcon size={12} color={COLORS.steel} />}
      {missing ? (
        <span onClick={edit} style={{ color: COLORS.rust, fontSize: 13, flex: 1, cursor: "pointer", fontStyle: "italic" }}>
          {link.label} — click to add link
        </span>
      ) : (
        <a href={link.url} target="_blank" rel="noreferrer" style={{ color: COLORS.steel, fontSize: 13, flex: 1 }}>{link.label}</a>
      )}
      <button onClick={edit} style={chipXStyle} title="Edit"><Pencil size={11} /></button>
      <button onClick={onRemove} style={chipXStyle} title="Remove"><X size={12} /></button>
    </div>
  );
}

/* ---------------------------------------------------------------
   App
----------------------------------------------------------------- */

export default function OnboardingWorkbook() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState(null); // {type:'section', id} | {type:'module', monthIdx, moduleId}
  const [ldOpen, setLdOpen] = useState(true);
  const [openMonths, setOpenMonths] = useState({ 0: true });
  const [toast, setToast] = useState("");
  const fileInputRef = useRef(null);
  const saveTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }, []);

  useEffect(() => {
    (async () => {
      let parsed = null;
      try {
        const res = await getItem(STORAGE_KEY);
        if (res && res.value) parsed = JSON.parse(res.value);
      } catch (e) { /* nothing saved yet */ }

      if (!parsed) {
        parsed = seedData();
      } else if (!parsed.onboarding) {
        parsed.onboarding = seedOnboardingSections ? { sections: seedOnboardingSections() } : { sections: [] };
      }
      setData(parsed);
      setView({ type: "section", id: parsed.onboarding.sections[0]?.id });
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !data) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        showToast("Couldn't save — try again");
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded, showToast]);

  if (!loaded || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
        fontFamily: "Quicksand, sans-serif", color: COLORS.forest }}>
        Loading the onboarding workbook…
      </div>
    );
  }

  const update = (fn) => setData((prev) => {
    const next = JSON.parse(JSON.stringify(prev));
    fn(next);
    return next;
  });

  /* ---- onboarding section actions ---- */
  const addSection = () => {
    const title = window.prompt("Section title");
    if (!title) return;
    const id = uid();
    update((d) => d.onboarding.sections.push({ id, title, items: [] }));
    setView({ type: "section", id });
  };
  const deleteSection = (id) => {
    if (!window.confirm("Delete this section and its items?")) return;
    update((d) => { d.onboarding.sections = d.onboarding.sections.filter((s) => s.id !== id); });
    setView({ type: "section", id: data.onboarding.sections[0]?.id });
  };

  /* ---- L&D actions ---- */
  const addMonth = () => {
    const name = window.prompt("Name the new month (e.g. Month 2)", `Month ${data.months.length + 1}`);
    if (!name) return;
    update((d) => d.months.push({ id: uid(), name, modules: [] }));
    setOpenMonths((o) => ({ ...o, [data.months.length]: true }));
  };
  const addModule = (monthIdx) => {
    const title = window.prompt("Module title");
    if (!title) return;
    const sme = window.prompt("Subject matter expert(s)") || "";
    const id = uid();
    update((d) => d.months[monthIdx].modules.push({ id, title, sme, subheadings: [] }));
    setView({ type: "module", monthIdx, moduleId: id });
  };
  const deleteModule = (monthIdx, modId) => {
    if (!window.confirm("Delete this module and all its content?")) return;
    update((d) => { d.months[monthIdx].modules = d.months[monthIdx].modules.filter((m) => m.id !== modId); });
    setView({ type: "section", id: data.onboarding.sections[0]?.id });
  };
  const deleteMonth = (monthIdx) => {
    if (!window.confirm(`Delete "${data.months[monthIdx].name}" and everything in it?`)) return;
    update((d) => { d.months.splice(monthIdx, 1); });
    setView({ type: "section", id: data.onboarding.sections[0]?.id });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ecology-onboarding-workbook.json"; a.click();
    URL.revokeObjectURL(url);
    showToast("Workbook exported");
  };
  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.months || !parsed.onboarding) throw new Error("bad shape");
        setData(parsed);
        setView({ type: "section", id: parsed.onboarding.sections[0]?.id });
        showToast("Workbook imported");
      } catch {
        showToast("That file doesn't look like a workbook export");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const resetToSeed = () => {
    if (!window.confirm("Reset to the original workbook content? This replaces everything currently saved.")) return;
    const seed = seedData();
    setData(seed);
    setView({ type: "section", id: seed.onboarding.sections[0].id });
  };

  const activeMonthIdx = view?.type === "module" ? view.monthIdx : null;
  const activeModule = view?.type === "module" ? data.months[view.monthIdx]?.modules.find((m) => m.id === view.moduleId) : null;
  const activeSection = view?.type === "section" ? data.onboarding.sections.find((s) => s.id === view.id) : null;

  return (
    <div style={{
      display: "flex", height: "100%", minHeight: 640, background: COLORS.paper,
      fontFamily: "'Newsreader', serif", color: COLORS.ink, overflow: "hidden",
      borderRadius: 12, border: `1px solid ${COLORS.line}`,
    }}>
      {/* -------- Sidebar -------- */}
      <aside style={{
        width: 300, flexShrink: 0, background: COLORS.forest, color: COLORS.paper,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "20px 20px 14px" }}>
          <div style={{
            background: "#FFFFFF", borderRadius: 10, padding: "12px 16px",
            display: "inline-block",
          }}>
            <img src="/logo.png" alt="Ecology Consulting" style={{ height: 32, width: "auto", display: "block" }} />
          </div>
          <div style={{ fontSize: 11, color: COLORS.goldLight, marginTop: 12, letterSpacing: 0.4, fontFamily: "Quicksand, sans-serif" }}>
            BUILDING CAPABILITY · SUPPORTING PEOPLE · GROWING TOGETHER
          </div>
          <div style={{ fontSize: 13, marginTop: 10, fontFamily: "Quicksand, sans-serif", fontWeight: 600 }}>
            New Employee Onboarding Workbook
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 12px" }}>
          {data.onboarding.sections.map((s) => {
            const active = view?.type === "section" && view.id === s.id;
            const pct = sectionProgress(s);
            return (
              <div
                key={s.id}
                onClick={() => setView({ type: "section", id: s.id })}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 7,
                  cursor: "pointer", marginBottom: 2,
                  background: active ? "rgba(199,154,69,0.22)" : "transparent",
                  borderLeft: active ? `3px solid ${COLORS.gold}` : "3px solid transparent",
                }}
              >
                <ClipboardList size={14} color={COLORS.goldLight} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1, fontFamily: "Quicksand, sans-serif", fontWeight: active ? 700 : 500 }}>{s.title}</span>
                <span style={{ fontSize: 10.5, color: COLORS.goldLight, fontFamily: "Quicksand, sans-serif" }}>{Math.round(pct)}%</span>
                <button onClick={(e) => { e.stopPropagation(); deleteSection(s.id); }} style={iconBtnGhost} title="Delete section"><Trash2 size={12} /></button>
              </div>
            );
          })}
          <button onClick={addSection} style={sidebarAddBtn}><Plus size={13} /> Add section</button>

          <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "14px 0" }} />

          {/* Learning & Development — sub item */}
          <div
            onClick={() => setLdOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 8px", borderRadius: 8, cursor: "pointer",
              background: view?.type === "module" ? "rgba(255,255,255,0.08)" : "transparent",
            }}
          >
            {ldOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <GraduationCap size={15} color={COLORS.goldLight} />
            <span style={{ fontFamily: "Quicksand, sans-serif", fontWeight: 700, fontSize: 13.5, flex: 1 }}>
              Learning &amp; Development Modules
            </span>
          </div>

          {ldOpen && (
            <div style={{ paddingLeft: 10, marginTop: 4 }}>
              {data.months.map((m, mi) => {
                const isOpen = !!openMonths[mi];
                const pct = monthProgress(m);
                return (
                  <div key={m.id} style={{ marginBottom: 8 }}>
                    <div
                      onClick={() => setOpenMonths((o) => ({ ...o, [mi]: !o[mi] }))}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer" }}
                    >
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <span style={{ fontFamily: "Quicksand, sans-serif", fontWeight: 600, fontSize: 13, flex: 1 }}>{m.name}</span>
                      <span style={{ fontSize: 10.5, color: COLORS.goldLight, fontFamily: "Quicksand, sans-serif" }}>{Math.round(pct)}%</span>
                      <button title="Delete month" onClick={(e) => { e.stopPropagation(); deleteMonth(mi); }} style={iconBtnGhost}><Trash2 size={12} /></button>
                    </div>
                    {isOpen && (
                      <div style={{ paddingLeft: 16 }}>
                        {m.modules.map((mod2, idx) => {
                          const active = view?.type === "module" && view.moduleId === mod2.id;
                          return (
                            <div
                              key={mod2.id}
                              onClick={() => setView({ type: "module", monthIdx: mi, moduleId: mod2.id })}
                              style={{
                                display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7,
                                cursor: "pointer", marginBottom: 2,
                                background: active ? "rgba(199,154,69,0.22)" : "transparent",
                                borderLeft: active ? `3px solid ${COLORS.gold}` : "3px solid transparent",
                              }}
                            >
                              <span style={{ fontFamily: "Quicksand, sans-serif", fontSize: 10.5, fontWeight: 700, color: COLORS.goldLight, width: 14 }}>{idx + 1}</span>
                              <span style={{ fontSize: 12.5, lineHeight: 1.3, flex: 1 }}>{mod2.title}</span>
                            </div>
                          );
                        })}
                        <button onClick={() => addModule(mi)} style={sidebarAddBtn}><Plus size={12} /> Add module</button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={addMonth} style={{ ...sidebarAddBtn, background: "rgba(255,255,255,0.06)" }}><Plus size={12} /> Add month</button>
            </div>
          )}
        </div>

        <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 8 }}>
          <button onClick={exportData} title="Export the workbook as a JSON file" style={footerBtn}><Download size={13} /> Export</button>
          <button onClick={() => fileInputRef.current?.click()} title="Import a previously exported workbook" style={footerBtn}><Upload size={13} /> Import</button>
          <button onClick={resetToSeed} title="Reset to the original content" style={footerBtn}><RotateCcw size={13} /></button>
          <input type="file" accept="application/json" ref={fileInputRef} onChange={importData} style={{ display: "none" }} />
        </div>
      </aside>

      {/* -------- Main -------- */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 40px 60px" }}>
        {view?.type === "module" && activeModule && (
          <ModulePanel
            key={activeModule.id}
            month={data.months[activeMonthIdx]}
            monthIdx={activeMonthIdx}
            mod={activeModule}
            onUpdate={update}
            onDeleteModule={() => deleteModule(activeMonthIdx, activeModule.id)}
          />
        )}
        {view?.type === "section" && activeSection && (
          <SectionPanel key={activeSection.id} section={activeSection} onUpdate={update} />
        )}
        {!activeModule && !activeSection && (
          <div style={{ maxWidth: 420, margin: "80px auto", textAlign: "center" }}>
            <Leaf size={30} color={COLORS.gold} style={{ marginBottom: 10 }} />
            <h2 style={{ fontFamily: "Quicksand, sans-serif", color: COLORS.forest }}>Nothing selected</h2>
            <p style={{ color: COLORS.inkSoft }}>Pick a section from the workbook, or a module under Learning &amp; Development.</p>
          </div>
        )}
      </main>

      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, background: COLORS.forest, color: COLORS.paper,
          padding: "9px 16px", borderRadius: 8, fontFamily: "Quicksand, sans-serif", fontSize: 13,
          boxShadow: "0 4px 14px rgba(0,0,0,0.2)", zIndex: 50,
        }}>{toast}</div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Onboarding checklist section (Employee Details, Day 1 - WHS, etc.)
----------------------------------------------------------------- */

function SectionPanel({ section, onUpdate }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const pct = sectionProgress(section);

  const patchSection = (patch) => onUpdate((d) => {
    const s = d.onboarding.sections.find((x) => x.id === section.id);
    Object.assign(s, patch);
  });
  const addItem = () => {
    const name = window.prompt("Item name");
    if (!name) return;
    onUpdate((d) => {
      const s = d.onboarding.sections.find((x) => x.id === section.id);
      s.items.push(mkItem(name));
    });
  };

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 6 }}>
        <GrowthRing pct={pct} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Quicksand, sans-serif", fontSize: 12, color: COLORS.steel, fontWeight: 700, letterSpacing: 0.5 }}>
            ONBOARDING WORKBOOK
          </div>
          {editingTitle ? (
            <input autoFocus defaultValue={section.title}
              onBlur={(e) => { patchSection({ title: e.target.value || section.title }); setEditingTitle(false); }}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
              style={{ ...h1Style, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "2px 6px", width: "100%" }} />
          ) : (
            <h1 style={h1Style} onClick={() => setEditingTitle(true)} title="Click to rename">
              {section.title} <Pencil size={13} style={{ opacity: 0.35, marginLeft: 4 }} />
            </h1>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: COLORS.line, margin: "18px 0" }} />

      {section.items.map((item) => (
        <ChecklistItemRow key={item.id} item={item} sectionId={section.id} onUpdate={onUpdate} />
      ))}
      {section.items.length === 0 && <p style={{ color: COLORS.inkSoft, fontStyle: "italic" }}>No items yet.</p>}

      <button onClick={addItem} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none",
        border: `1px dashed ${COLORS.steelLight}`, color: COLORS.steel, borderRadius: 8,
        padding: "9px 14px", fontFamily: "Quicksand, sans-serif", fontWeight: 600, fontSize: 13,
        cursor: "pointer", marginTop: 10,
      }}>
        <Plus size={14} /> Add item
      </button>
    </div>
  );
}

function ChecklistItemRow({ item, sectionId, onUpdate }) {
  const [open, setOpen] = useState(false);

  const withItem = (fn) => onUpdate((d) => {
    const s = d.onboarding.sections.find((x) => x.id === sectionId);
    const it = s.items.find((x) => x.id === item.id);
    fn(it);
  });

  const toggleDone = (e) => { e.stopPropagation(); withItem((it) => { it.done = !it.done; }); };
  const removeItem = () => {
    if (!window.confirm(`Remove "${item.name}"?`)) return;
    onUpdate((d) => {
      const s = d.onboarding.sections.find((x) => x.id === sectionId);
      s.items = s.items.filter((x) => x.id !== item.id);
    });
  };

  return (
    <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, background: "#FFFFFFAA", marginBottom: 8, overflow: "hidden" }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer" }}>
        <button onClick={toggleDone} style={{
          width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${item.done ? COLORS.gold : COLORS.line}`,
          background: item.done ? COLORS.gold : "transparent", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0, cursor: "pointer",
        }}>
          {item.done && <Check size={13} color="#fff" />}
        </button>
        <span style={{
          flex: 1, fontFamily: "Quicksand, sans-serif", fontWeight: 600, fontSize: 14,
          color: item.done ? COLORS.inkSoft : COLORS.ink, textDecoration: item.done ? "line-through" : "none",
        }}>{item.name}</span>
        <Calendar size={13} color={COLORS.inkSoft} />
        <input
          type="date" defaultValue={item.date} onClick={(e) => e.stopPropagation()}
          onChange={(e) => withItem((it) => { it.date = e.target.value; })}
          style={{ border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 11.5, fontFamily: "Quicksand, sans-serif", padding: "2px 4px" }}
        />
        {open ? <ChevronDown size={15} color={COLORS.inkSoft} /> : <ChevronRight size={15} color={COLORS.inkSoft} />}
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px 44px" }}>
          <textarea
            defaultValue={item.notes}
            onBlur={(e) => withItem((it) => { it.notes = e.target.value; })}
            placeholder="Notes…"
            style={{ width: "100%", minHeight: 48, border: `1px solid ${COLORS.line}`, borderRadius: 7, padding: "7px 9px",
              fontFamily: "'Newsreader', serif", fontSize: 14, color: COLORS.ink, resize: "vertical", background: "#fff" }}
          />
          <div style={{ marginTop: 8 }}>
            {item.links.map((l) => (
              <LinkRow key={l.id} link={l}
                onEdit={(nl) => withItem((it) => { it.links = it.links.map((x) => (x.id === l.id ? nl : x)); })}
                onRemove={() => withItem((it) => { it.links = it.links.filter((x) => x.id !== l.id); })}
              />
            ))}
            <LinkAdder onAdd={(l) => withItem((it) => it.links.push(l))} />
          </div>
          <button onClick={removeItem} style={{
            marginTop: 10, background: "none", border: "none", color: COLORS.rust, fontSize: 12,
            fontFamily: "Quicksand, sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <Trash2 size={12} /> Remove item
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Learning & Development module panel
----------------------------------------------------------------- */

function ModulePanel({ month, monthIdx, mod, onUpdate, onDeleteModule }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSme, setEditingSme] = useState(false);
  const idx = month.modules.findIndex((m) => m.id === mod.id);
  const pct = moduleProgress(mod);

  const patchModule = (patch) => onUpdate((d) => {
    const m = d.months[monthIdx].modules.find((x) => x.id === mod.id);
    Object.assign(m, patch);
  });

  const addSub = () => {
    const title = window.prompt("Sub-heading title");
    if (!title) return;
    onUpdate((d) => {
      const m = d.months[monthIdx].modules.find((x) => x.id === mod.id);
      m.subheadings.push({ id: uid(), title, notes: "", links: [], attachments: [], done: false });
    });
  };

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 6 }}>
        <GrowthRing pct={pct} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Quicksand, sans-serif", fontSize: 12, color: COLORS.steel, fontWeight: 700, letterSpacing: 0.5 }}>
            {month.name.toUpperCase()} · MODULE {idx + 1}
          </div>
          {editingTitle ? (
            <input autoFocus defaultValue={mod.title}
              onBlur={(e) => { patchModule({ title: e.target.value || mod.title }); setEditingTitle(false); }}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
              style={{ ...h1Style, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "2px 6px", width: "100%" }} />
          ) : (
            <h1 style={h1Style} onClick={() => setEditingTitle(true)} title="Click to rename">
              {mod.title} <Pencil size={14} style={{ opacity: 0.35, marginLeft: 4 }} />
            </h1>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Users size={14} color={COLORS.steel} />
            {editingSme ? (
              <input autoFocus defaultValue={mod.sme}
                onBlur={(e) => { patchModule({ sme: e.target.value }); setEditingSme(false); }}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                style={{ fontFamily: "Quicksand, sans-serif", fontSize: 13, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "2px 6px" }} />
            ) : (
              <span onClick={() => setEditingSme(true)} style={{
                fontFamily: "Quicksand, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.steel,
                background: "#EAF0F5", padding: "3px 10px", borderRadius: 20, cursor: "pointer",
              }}>{mod.sme || "Add SME"}</span>
            )}
          </div>
        </div>
        <button onClick={onDeleteModule} title="Delete module" style={{ background: "none", border: "none", color: COLORS.rust, cursor: "pointer", padding: 6 }}>
          <Trash2 size={16} />
        </button>
      </div>

      <div style={{ height: 1, background: COLORS.line, margin: "20px 0" }} />

      <div style={{ position: "relative", paddingLeft: 18 }}>
        <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: COLORS.line }} />
        {mod.subheadings.map((s, i) => (
          <SubheadingCard key={s.id} sub={s} monthIdx={monthIdx} modId={mod.id} onUpdate={onUpdate} />
        ))}
        {mod.subheadings.length === 0 && <p style={{ color: COLORS.inkSoft, fontStyle: "italic", marginLeft: 8 }}>No sub-headings yet.</p>}
      </div>

      <button onClick={addSub} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none",
        border: `1px dashed ${COLORS.steelLight}`, color: COLORS.steel, borderRadius: 8,
        padding: "9px 14px", fontFamily: "Quicksand, sans-serif", fontWeight: 600, fontSize: 13,
        cursor: "pointer", marginTop: 6, marginLeft: 18,
      }}>
        <Plus size={14} /> Add sub-heading
      </button>
    </div>
  );
}

function SubheadingCard({ sub, monthIdx, modId, onUpdate }) {
  const [open, setOpen] = useState(sub.links.some((l) => !l.url));
  const [addingAttachment, setAddingAttachment] = useState(false);
  const [attLabel, setAttLabel] = useState("");
  const [attUrl, setAttUrl] = useState("");

  const withSub = (fn) => onUpdate((d) => {
    const m = d.months[monthIdx].modules.find((x) => x.id === modId);
    const s = m.subheadings.find((x) => x.id === sub.id);
    fn(s, m);
  });

  const toggleDone = (e) => { e.stopPropagation(); withSub((s) => { s.done = !s.done; }); };
  const removeSub = () => {
    if (!window.confirm(`Remove "${sub.title}"?`)) return;
    onUpdate((d) => {
      const m = d.months[monthIdx].modules.find((x) => x.id === modId);
      m.subheadings = m.subheadings.filter((x) => x.id !== sub.id);
    });
  };
  const saveNotes = (val) => withSub((s) => { s.notes = val; });
  const saveTitle = (val) => withSub((s) => { s.title = val || sub.title; });

  const submitAttachment = () => {
    if (!attLabel.trim()) return;
    withSub((s) => s.attachments.push({ id: uid(), label: attLabel.trim(), url: attUrl.trim() }));
    setAttLabel(""); setAttUrl(""); setAddingAttachment(false);
  };
  const removeAttachment = (id) => withSub((s) => { s.attachments = s.attachments.filter((a) => a.id !== id); });

  const hasFlag = sub.links.some((l) => !l.url);

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <div style={{
        position: "absolute", left: -18 + 5, top: 14, width: 9, height: 9, borderRadius: "50%",
        background: sub.done ? COLORS.gold : COLORS.paper, border: `2px solid ${sub.done ? COLORS.gold : COLORS.steelLight}`,
      }} />
      <div style={{ border: `1px solid ${hasFlag ? "#E0B48A" : COLORS.line}`, borderRadius: 10, background: "#FFFFFFAA", overflow: "hidden" }}>
        <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer" }}>
          <button onClick={toggleDone} title={sub.done ? "Mark not started" : "Mark complete"} style={{
            width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${sub.done ? COLORS.gold : COLORS.line}`,
            background: sub.done ? COLORS.gold : "transparent", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, cursor: "pointer",
          }}>
            {sub.done && <Check size={13} color="#fff" />}
          </button>
          <span style={{
            flex: 1, fontFamily: "Quicksand, sans-serif", fontWeight: 600, fontSize: 14.5,
            color: sub.done ? COLORS.inkSoft : COLORS.ink, textDecoration: sub.done ? "line-through" : "none",
          }}>{sub.title}</span>
          {!open && sub.links.some((l) => l.type === "video") && <PlayCircle size={13} color={COLORS.gold} />}
          {!open && sub.links.some((l) => l.type !== "video") && <LinkIcon size={13} color={COLORS.steel} />}
          {!open && sub.attachments.length > 0 && <Paperclip size={13} color={COLORS.steel} />}
          {open ? <ChevronDown size={15} color={COLORS.inkSoft} /> : <ChevronRight size={15} color={COLORS.inkSoft} />}
        </div>

        {open && (
          <div style={{ padding: "0 14px 16px 44px" }}>
            <input defaultValue={sub.title} onBlur={(e) => saveTitle(e.target.value)}
              style={{ fontFamily: "Quicksand, sans-serif", fontSize: 12.5, color: COLORS.inkSoft, border: "none",
                borderBottom: `1px solid ${COLORS.line}`, background: "transparent", padding: "2px 0", marginBottom: 10, width: "100%" }}
              placeholder="Sub-heading title" />
            <textarea defaultValue={sub.notes} onBlur={(e) => saveNotes(e.target.value)}
              placeholder="Notes, key points, or what a new starter needs to know for this topic…"
              style={{ width: "100%", minHeight: 60, border: `1px solid ${COLORS.line}`, borderRadius: 7, padding: "8px 10px",
                fontFamily: "'Newsreader', serif", fontSize: 14.5, color: COLORS.ink, resize: "vertical", background: "#fff" }} />

            <div style={{ marginTop: 10 }}>
              {sub.links.map((l) => (
                <LinkRow key={l.id} link={l}
                  onEdit={(nl) => withSub((s) => { s.links = s.links.map((x) => (x.id === l.id ? nl : x)); })}
                  onRemove={() => withSub((s) => { s.links = s.links.filter((x) => x.id !== l.id); })}
                />
              ))}
              <LinkAdder onAdd={(l) => withSub((s) => s.links.push(l))} />
            </div>

            <div style={{ marginTop: 8 }}>
              {sub.attachments.map((a) => (
                <div key={a.id} style={rowChipStyle}>
                  <Paperclip size={12} color={COLORS.gold} />
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ color: COLORS.ink, fontSize: 13, flex: 1 }}>{a.label}</a>
                  ) : (
                    <span style={{ fontSize: 13, flex: 1 }}>{a.label}</span>
                  )}
                  <button onClick={() => removeAttachment(a.id)} style={chipXStyle}><X size={12} /></button>
                </div>
              ))}
              {addingAttachment ? (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input placeholder="Reference, e.g. WHS Policy.pdf" value={attLabel} onChange={(e) => setAttLabel(e.target.value)} style={{ ...miniInput, flex: 1.4 }} />
                  <input placeholder="Link (optional, e.g. SharePoint URL)" value={attUrl} onChange={(e) => setAttUrl(e.target.value)} style={{ ...miniInput, flex: 1.4 }}
                    onKeyDown={(e) => e.key === "Enter" && submitAttachment()} />
                  <button onClick={submitAttachment} style={miniAddBtn}>Add</button>
                  <button onClick={() => setAddingAttachment(false)} style={miniCancelBtn}><X size={13} /></button>
                </div>
              ) : (
                <button onClick={() => setAddingAttachment(true)} style={addSmallBtn}><Plus size={11} /> Add attachment reference</button>
              )}
            </div>

            <button onClick={removeSub} style={{
              marginTop: 12, background: "none", border: "none", color: COLORS.rust, fontSize: 12,
              fontFamily: "Quicksand, sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>
              <Trash2 size={12} /> Remove sub-heading
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
