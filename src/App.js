import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

// ============================================================
// FIREBASE CONFIG
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAhI8A2cFZczYVHXtXq-TRYoT3x6Ee6O1M",
  authDomain: "stamboom20260307.firebaseapp.com",
  databaseURL: "https://stamboom20260307-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stamboom20260307",
  storageBucket: "stamboom20260307.firebasestorage.app",
  messagingSenderId: "383682219255",
  appId: "1:383682219255:web:09614715b63b807367d7f2"
};

let firebaseDb = null, useFirebase = false;

const initFirebase = () => new Promise((resolve) => {
  const s1 = document.createElement("script");
  s1.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
  s1.onload = () => {
    const s2 = document.createElement("script");
    s2.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js";
    s2.onload = () => {
      try {
        window.firebase.initializeApp(FIREBASE_CONFIG);
        firebaseDb = window.firebase.database();
        useFirebase = true;
        resolve(true);
      } catch (e) { resolve(false); }
    };
    s2.onerror = () => resolve(false);
    document.head.appendChild(s2);
  };
  s1.onerror = () => resolve(false);
  document.head.appendChild(s1);
  setTimeout(() => resolve(false), 5000);
});

// ============================================================
// Helpers
// ============================================================
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const C = {
  bg: "#FBF8F3", bgW: "#F5EDE3", bgC: "#E4EDE8",
  c1: "#E8D5C0", c1h: "#DEC8AF", a1: "#B8860B",
  c2: "#C5D5CC", c2h: "#B5C8BD", a2: "#2E6B50",
  tx: "#3A2E22", txL: "#7A6E62", txM: "#A89E94",
  wh: "#FFFFFF", dng: "#C44536", dngL: "#F0D5D1",
  sh: "rgba(58,46,34,0.08)", bd: "rgba(58,46,34,0.1)", ln: "rgba(58,46,34,0.25)"
};

const ff = "'Source Sans 3','Georgia',serif";
const fh = "'Playfair Display','Georgia',serif";
const gC = [
  { bg: "#FFFDF8", bd: "#C9A84C" }, { bg: "#FFF8EE", bd: "#E0C99A" },
  { bg: "#EDF5F1", bd: "#8BBF9F" }, { bg: "#F3EEF8", bd: "#B89ED4" },
  { bg: "#FFF0F0", bd: "#D4A0A0" }
];
const genColor = (d) => gC[Math.min(d, gC.length - 1)];
const genLabel = (d) => ["stamouder", "kind", "kleinkind", "achterkleinkind"][d] || `generatie ${d + 1}`;

// ============================================================
// Shared UI Components
// ============================================================
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(58,46,34,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.wh, borderRadius: 16, padding: "28px 24px", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(58,46,34,0.18)" }}>
        <h3 style={{ fontFamily: fh, fontSize: 22, color: C.tx, margin: "0 0 20px", fontWeight: 600 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small, style = {}, disabled }) {
  const v = { primary: { bg: C.a1, c: C.wh }, secondary: { bg: C.bgW, c: C.tx }, danger: { bg: C.dng, c: C.wh }, ghost: { bg: "transparent", c: C.txL } }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: v.bg, color: v.c, border: "none", borderRadius: 10, padding: small ? "8px 14px" : "12px 20px", fontSize: small ? 14 : 16, fontWeight: 500, fontFamily: ff, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", minHeight: 44, ...style }}>
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, autoFocus }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
      style={{ width: "100%", padding: "12px 16px", fontSize: 16, border: `2px solid ${C.bd}`, borderRadius: 10, fontFamily: ff, color: C.tx, background: C.bg, outline: "none", boxSizing: "border-box" }}
      onFocus={(e) => (e.target.style.borderColor = C.a1)}
      onBlur={(e) => (e.target.style.borderColor = C.bd)}
    />
  );
}

// ============================================================
// SETUP SCREEN
// ============================================================
function SetupScreen({ onComplete }) {
  const [fn1, sF1] = useState(""), [fn2, sF2] = useState("");
  const [s1, sS1] = useState([{ id: uid(), first: "", last: "", pF: "", pL: "" }]);
  const [s2, sS2] = useState([{ id: uid(), first: "", last: "", pF: "", pL: "" }]);
  const [step, sStep] = useState(1);

  const addS = (side) => {
    const e = { id: uid(), first: "", last: "", pF: "", pL: "" };
    side === 1 ? sS1((a) => [...a, e]) : sS2((a) => [...a, e]);
  };
  const updS = (side, id, f, v) => (side === 1 ? sS1 : sS2)((a) => a.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
  const delS = (side, id) => (side === 1 ? sS1 : sS2)((a) => a.filter((x) => x.id !== id));

  const finish = () => {
    const treeId = uid();
    const data = { id: treeId, familyName1: fn1.trim(), familyName2: fn2.trim(), people: {}, branches: {} };
    const addB = (s, side) => {
      if (!s.first.trim()) return;
      const bId = uid(), sId = uid();
      data.people[sId] = { id: sId, firstName: s.first.trim(), lastName: s.last.trim(), branchId: bId, familySide: side, partnerId: null, parentId: null, depth: 0 };
      let pId = null;
      if (s.pF.trim()) {
        pId = uid();
        data.people[pId] = { id: pId, firstName: s.pF.trim(), lastName: s.pL.trim(), branchId: bId, familySide: side, partnerId: sId, parentId: null, depth: 0, isPartnerOf: sId };
        data.people[sId].partnerId = pId;
      }
      data.branches[bId] = { id: bId, stamouderId: sId, partnerId: pId, familySide: side };
    };
    s1.forEach((s) => addB(s, 1));
    s2.forEach((s) => addB(s, 2));
    onComplete(treeId, data);
  };

  const renderList = (list, side) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {list.map((s, i) => (
        <div key={s.id} style={{ background: C.wh, borderRadius: 12, padding: 16, border: `1px solid ${C.bd}`, boxShadow: `0 2px 8px ${C.sh}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.txM, textTransform: "uppercase", letterSpacing: 1 }}>Stamouder {i + 1}</span>
            {list.length > 1 && <button onClick={() => delS(side, s.id)} style={{ background: "none", border: "none", color: C.dng, cursor: "pointer", fontSize: 20, padding: 4 }}>×</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <Input value={s.first} onChange={(v) => updS(side, s.id, "first", v)} placeholder="Voornaam" />
            <Input value={s.last} onChange={(v) => updS(side, s.id, "last", v)} placeholder="Achternaam" />
          </div>
          <div style={{ fontSize: 13, color: C.txM, marginBottom: 6 }}>Partner (optioneel)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input value={s.pF} onChange={(v) => updS(side, s.id, "pF", v)} placeholder="Voornaam" />
            <Input value={s.pL} onChange={(v) => updS(side, s.id, "pL", v)} placeholder="Achternaam" />
          </div>
        </div>
      ))}
      <Btn variant="secondary" onClick={() => addS(side)} style={{ alignSelf: "flex-start" }}>+ Stamouder toevoegen</Btn>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: ff, color: C.tx }}>
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌳</div>
          <h1 style={{ fontFamily: fh, fontSize: 32, fontWeight: 700, margin: "0 0 8px" }}>Onze Stamboom</h1>
          <p style={{ color: C.txL, fontSize: 17, margin: 0 }}>Vul de gegevens in om jullie stamboom te starten</p>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 32, justifyContent: "center" }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ width: s === step ? 32 : 12, height: 12, borderRadius: 6, background: s === step ? C.a1 : s < step ? C.a2 : C.bd, transition: "all 0.3s" }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: fh, fontSize: 22, marginBottom: 20 }}>De twee families</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={{ fontSize: 14, fontWeight: 600, color: C.txL, display: "block", marginBottom: 6 }}>Familie 1</label><Input value={fn1} onChange={sF1} placeholder="bijv. De Vries" /></div>
              <div><label style={{ fontSize: 14, fontWeight: 600, color: C.txL, display: "block", marginBottom: 6 }}>Familie 2</label><Input value={fn2} onChange={sF2} placeholder="bijv. Jansen" /></div>
            </div>
            <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}><Btn onClick={() => sStep(2)} disabled={!fn1.trim() || !fn2.trim()}>Volgende →</Btn></div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: fh, fontSize: 22, marginBottom: 8 }}>Familie {fn1}</h2>
            <p style={{ color: C.txL, marginBottom: 20, lineHeight: 1.5 }}>Voeg de broers en zussen (stamouders) toe. Partners kun je nu of later invullen.</p>
            {renderList(s1, 1)}
            <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between" }}><Btn variant="ghost" onClick={() => sStep(1)}>← Terug</Btn><Btn onClick={() => sStep(3)}>Volgende →</Btn></div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: fh, fontSize: 22, marginBottom: 8 }}>Familie {fn2}</h2>
            <p style={{ color: C.txL, marginBottom: 20, lineHeight: 1.5 }}>Voeg de stamouders toe van de familie {fn2}.</p>
            {renderList(s2, 2)}
            {!s2.some((s) => s.first.trim()) && <div style={{ color: C.a1, fontSize: 14, marginTop: 12 }}>Vul minstens één stamouder in.</div>}
            <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between" }}>
              <Btn variant="ghost" onClick={() => sStep(2)}>← Terug</Btn>
              <Btn onClick={finish} disabled={!s1.some((s) => s.first.trim()) || !s2.some((s) => s.first.trim())}>🌳 Start de stamboom</Btn>
            </div>
          </div>
        )}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');`}</style>
    </div>
  );
}

// ============================================================
// OVERVIEW SCREEN
// ============================================================
function OverviewScreen({ treeData, onOpenBranch }) {
  if (!treeData) return null;
  const branches = Object.values(treeData.branches || {});
  const people = treeData.people || {};
  const total = Object.keys(people).length;
  const [exporting, setExporting] = useState(false);

  const dirKids = (bId, sId) => Object.values(people).filter((p) => p.branchId === bId && p.parentId === sId && !p.isPartnerOf);
  const descCount = (bId) => Object.values(people).filter((p) => p.branchId === bId && p.depth > 0 && !p.isPartnerOf).length;
  const partnerOf = (pid) => { const p = people[pid]; return p?.partnerId ? people[p.partnerId] || null : null; };
  const kidsOf = (pid, bId) => Object.values(people).filter((p) => p.branchId === bId && p.parentId === pid && !p.isPartnerOf);

  // ---- PDF EXPORT with jsPDF ----
  const buildLines = (pid, bId, d = 0) => {
    const p = people[pid]; if (!p) return [];
    const partner = partnerOf(pid);
    const labels = ["Stamouder", "Kind", "Kleinkind", "Achterkleinkind"];
    let name = `${p.firstName} ${p.lastName}`.trim();
    if (partner) name += `  &  ${partner.firstName} ${partner.lastName}`.trim();
    const lines = [{ name, depth: d, label: labels[d] || `Gen. ${d + 1}` }];
    for (const k of kidsOf(pid, bId)) lines.push(...buildLines(k.id, bId, d + 1));
    return lines;
  };

  const handleExportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), m = 20;
      let y = 25;
      const chk = (n) => { if (y + n > ph - 20) { doc.addPage(); y = 20; } };

      doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(58, 46, 34);
      doc.text(`Stamboom ${treeData.familyName1} & ${treeData.familyName2}`, m, y); y += 8;
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(122, 110, 98);
      doc.text(`${total} familieleden`, m, y); y += 14;

      const renderSide = (list, name, r, g, b) => {
        chk(16);
        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(r, g, b);
        doc.text(`Familie ${name}`, m, y); y += 2;
        doc.setDrawColor(r, g, b); doc.setLineWidth(0.5); doc.line(m, y, pw - m, y); y += 10;
        for (const br of list) {
          for (const ln of buildLines(br.stamouderId, br.id, 0)) {
            chk(8);
            const ind = m + ln.depth * 10;
            const bc = [[201, 168, 76], [224, 201, 154], [139, 191, 159], [184, 158, 212], [212, 160, 160]][Math.min(ln.depth, 4)];
            doc.setFillColor(bc[0], bc[1], bc[2]); doc.rect(ind, y - 4, 2, 5, "F");
            doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(58, 46, 34);
            doc.text(ln.name, ind + 5, y);
            const nw = doc.getTextWidth(ln.name);
            doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(168, 158, 148);
            doc.text(ln.label, ind + 5 + nw + 4, y);
            y += 7;
          }
          y += 5;
        }
        y += 5;
      };

      renderSide(branches.filter((b) => b.familySide === 1), treeData.familyName1, 184, 134, 11);
      renderSide(branches.filter((b) => b.familySide === 2), treeData.familyName2, 46, 107, 80);

      chk(16); y += 5;
      doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(m, y, pw - m, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(168, 158, 148);
      doc.text(`Geexporteerd op ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`, m, y);

      doc.save(`stamboom-${treeData.familyName1}-${treeData.familyName2}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
      alert("PDF export mislukt: " + e.message);
    }
    setExporting(false);
  };

  // ---- UI ----
  const Card = ({ branch, accent, bg, bgH }) => {
    const st = people[branch.stamouderId], pt = branch.partnerId ? people[branch.partnerId] : null;
    const kids = dirKids(branch.id, branch.stamouderId), cnt = descCount(branch.id);
    const [h, sH] = useState(false);
    return (
      <div onClick={() => onOpenBranch(branch.id)} onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
        style={{ background: h ? bgH : bg, borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s", border: `1px solid ${C.bd}`, boxShadow: `0 2px 8px ${C.sh}` }}>
        <div style={{ fontFamily: fh, fontSize: 18, fontWeight: 600, color: C.tx, marginBottom: 2 }}>{st ? `${st.firstName} ${st.lastName}`.trim() : "?"}</div>
        <div style={{ fontSize: 15, color: C.txL, marginBottom: 10 }}>& {pt ? `${pt.firstName} ${pt.lastName}`.trim() : "partner onbekend"}</div>
        {kids.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: C.txM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Kinderen</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {kids.map((k) => (<span key={k.id} style={{ background: C.wh, borderRadius: 6, padding: "2px 8px", fontSize: 13, color: C.tx, border: `1px solid ${C.bd}` }}>{k.firstName}</span>))}
            </div>
          </div>
        )}
        <div style={{ display: "inline-block", background: accent, color: C.wh, borderRadius: 20, padding: "3px 12px", fontSize: 13, fontWeight: 500 }}>
          {cnt} {cnt === 1 ? "nakomeling" : "nakomelingen"}
        </div>
      </div>
    );
  };

  const Side = ({ list, name, accent, bg, bgH }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 4, height: 32, background: accent, borderRadius: 2 }} />
        <h2 style={{ fontFamily: fh, fontSize: 26, fontWeight: 700, color: C.tx, margin: 0 }}>Familie {name}</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {list.map((b) => (<Card key={b.id} branch={b} accent={accent} bg={bg} bgH={bgH} />))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: ff, color: C.tx }}>
      <div style={{ background: C.wh, borderBottom: `1px solid ${C.bd}`, padding: 20, position: "sticky", top: 0, zIndex: 100, boxShadow: `0 2px 12px ${C.sh}` }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontFamily: fh, fontSize: 24, fontWeight: 700, margin: 0 }}>🌳 Onze Stamboom</h1>
          <div style={{ background: C.bgW, borderRadius: 20, padding: "6px 16px", fontSize: 14, fontWeight: 500, color: C.txL }}>{total} familieleden</div>
        </div>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 28, padding: "14px 18px", background: C.wh, borderRadius: 12, border: `1px solid ${C.bd}`, boxShadow: `0 1px 4px ${C.sh}` }}>
          <button onClick={handleExportPDF} disabled={exporting} style={{
            background: exporting ? C.bgW : C.a1, border: "none", borderRadius: 8,
            padding: "10px 20px", fontSize: 14, fontWeight: 500,
            color: exporting ? C.txL : C.wh, cursor: exporting ? "wait" : "pointer", fontFamily: ff
          }}>
            {exporting ? "Bezig met exporteren..." : "📄 Exporteer als PDF"}
          </button>
        </div>
        <Side list={branches.filter((b) => b.familySide === 1)} name={treeData.familyName1} accent={C.a1} bg={C.c1} bgH={C.c1h} />
        <Side list={branches.filter((b) => b.familySide === 2)} name={treeData.familyName2} accent={C.a2} bg={C.c2} bgH={C.c2h} />
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');`}</style>
    </div>
  );
}

// ============================================================
// BRANCH VIEW
// ============================================================
function BranchView({ treeData, branchId, onBack, onUpdateTree, treeId }) {
  const [modal, setModal] = useState(null);
  const [firstName, setFN] = useState("");
  const [lastName, setLN] = useState("");
  const [deleting, setDel] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  if (!treeData?.branches?.[branchId]) return null;
  const branch = treeData.branches[branchId];
  const people = treeData.people || {};
  const familyName = branch.familySide === 1 ? treeData.familyName1 : treeData.familyName2;

  const openModal = (type, targetId, person) => { setModal({ type, targetId, person }); setFN(person?.firstName || ""); setLN(person?.lastName || ""); };
  const closeModal = () => { setModal(null); setFN(""); setLN(""); };
  const getChildren = (pid) => Object.values(people).filter((p) => p.branchId === branchId && p.parentId === pid && !p.isPartnerOf);
  const getPartner = (pid) => { const p = people[pid]; return p?.partnerId ? people[p.partnerId] || null : null; };

  const setPerson = (id, data) => { onUpdateTree({ ...treeData, people: { ...treeData.people, [id]: data } }); if (useFirebase) firebaseDb.ref(`trees/${treeId}/people/${id}`).set(data); };
  const updatePerson = (id, fields) => { const ex = treeData.people[id]; if (!ex) return; onUpdateTree({ ...treeData, people: { ...treeData.people, [id]: { ...ex, ...fields } } }); if (useFirebase) firebaseDb.ref(`trees/${treeId}/people/${id}`).update(fields); };
  const removePerson = (id) => { const np = { ...treeData.people }; delete np[id]; onUpdateTree({ ...treeData, people: np }); if (useFirebase) firebaseDb.ref(`trees/${treeId}/people/${id}`).remove(); };

  const handleSave = () => {
    if (!firstName.trim() || !modal) return;
    if (modal.type === "edit") {
      updatePerson(modal.person.id, { firstName: firstName.trim(), lastName: lastName.trim() });
    } else if (modal.type === "partner") {
      const nId = uid(), t = people[modal.targetId], d = t?.depth ?? 0;
      const newPartner = { id: nId, firstName: firstName.trim(), lastName: lastName.trim(), branchId, familySide: branch.familySide, partnerId: modal.targetId, isPartnerOf: modal.targetId, parentId: t?.parentId || null, depth: d };
      const updatedPeople = { ...treeData.people, [nId]: newPartner, [modal.targetId]: { ...treeData.people[modal.targetId], partnerId: nId } };
      onUpdateTree({ ...treeData, people: updatedPeople });
      if (useFirebase) { firebaseDb.ref(`trees/${treeId}/people/${nId}`).set(newPartner); firebaseDb.ref(`trees/${treeId}/people/${modal.targetId}/partnerId`).set(nId); }
    } else if (modal.type === "child") {
      const nId = uid(), par = people[modal.targetId], d = (par?.depth ?? 0) + 1;
      setPerson(nId, { id: nId, firstName: firstName.trim(), lastName: lastName.trim(), branchId, familySide: branch.familySide, partnerId: null, isPartnerOf: null, parentId: modal.targetId, depth: d });
    }
    closeModal();
  };

  const handleDelete = (pid) => {
    const p = people[pid]; if (!p) return;
    if (p.partnerId && people[p.partnerId]) { p.isPartnerOf ? updatePerson(p.partnerId, { partnerId: null }) : removePerson(p.partnerId); }
    for (const k of getChildren(pid)) handleDelete(k.id);
    removePerson(pid); setDel(null);
  };

  const toggleCollapse = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const collapseAll = () => { const a = {}; Object.values(people).forEach((p) => { if (p.branchId === branchId && !p.isPartnerOf && getChildren(p.id).length > 0) a[p.id] = true; }); setCollapsed(a); };
  const expandAll = () => setCollapsed({});
  const countDesc = (pid) => { let c = 0; for (const k of getChildren(pid)) { c += 1 + countDesc(k.id); } return c; };

  const renderPerson = (person, depth = 0) => {
    if (!person) return null;
    const partner = getPartner(person.id), children = getChildren(person.id), gc = genColor(depth), label = genLabel(depth);
    const isC = collapsed[person.id] && children.length > 0, descN = children.length > 0 ? countDesc(person.id) : 0;

    return (
      <div key={person.id} style={{ marginTop: depth > 0 ? 16 : 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div style={{ background: gc.bg, border: `2px solid ${gc.bd}`, borderRadius: 14, padding: 16, minWidth: 140, boxShadow: `0 2px 10px ${C.sh}`, maxWidth: 240 }}>
            <div onClick={() => openModal("edit", null, person)} style={{ fontWeight: 600, fontSize: 17, color: C.tx, cursor: "pointer", marginBottom: 2, lineHeight: 1.3 }}>{person.firstName} {person.lastName}</div>
            <div style={{ fontSize: 11, color: C.txM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{label}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!partner && <button onClick={(e) => { e.stopPropagation(); openModal("partner", person.id); }} style={{ background: C.bgW, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: C.txL, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>+ Partner</button>}
              <button onClick={(e) => { e.stopPropagation(); openModal("child", person.id); }} style={{ background: C.bgC, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: C.a2, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>+ Kind</button>
              {children.length > 0 && <button onClick={(e) => { e.stopPropagation(); toggleCollapse(person.id); }} style={{ background: isC ? "#E8E0D4" : C.bgW, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: C.tx, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>{isC ? `▶ ${descN}` : "▼"}</button>}
              {depth > 0 && <button onClick={(e) => { e.stopPropagation(); setDel(person.id); }} style={{ background: C.dngL, border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.dng, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>✕</button>}
            </div>
          </div>
          {partner && (
            <>
              <div style={{ display: "flex", alignItems: "center", alignSelf: "center" }}><div style={{ width: 24, height: 2, background: C.ln }} /></div>
              <div style={{ background: gc.bg, border: `2px solid ${gc.bd}`, borderRadius: 14, padding: 16, minWidth: 140, boxShadow: `0 2px 10px ${C.sh}`, maxWidth: 220 }}>
                <div onClick={() => openModal("edit", null, partner)} style={{ fontWeight: 600, fontSize: 17, color: C.tx, cursor: "pointer", marginBottom: 2, lineHeight: 1.3 }}>{partner.firstName} {partner.lastName}</div>
                <div style={{ fontSize: 11, color: C.txM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>partner</div>
                <button onClick={(e) => { e.stopPropagation(); setDel(partner.id); }} style={{ background: C.dngL, border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.dng, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>✕</button>
              </div>
            </>
          )}
        </div>
        {children.length > 0 && !isC && <div style={{ marginLeft: 22, paddingLeft: 22, borderLeft: `2px solid ${C.ln}`, marginTop: 8 }}>{children.map((ch) => renderPerson(ch, depth + 1))}</div>}
        {isC && <div onClick={() => toggleCollapse(person.id)} style={{ marginLeft: 22, paddingLeft: 22, borderLeft: `2px dashed ${C.bd}`, marginTop: 8, padding: "8px 16px", color: C.txM, fontSize: 13, cursor: "pointer", fontStyle: "italic" }}>{descN} {descN === 1 ? "nakomeling" : "nakomelingen"} verborgen — tik om te tonen</div>}
      </div>
    );
  };

  const stamouder = people[branch.stamouderId];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: ff, color: C.tx }}>
      <div style={{ background: C.wh, borderBottom: `1px solid ${C.bd}`, padding: "16px 20px", position: "sticky", top: 0, zIndex: 100, boxShadow: `0 2px 12px ${C.sh}` }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Btn variant="ghost" small onClick={onBack}>← Terug</Btn>
          <div>
            <h1 style={{ fontFamily: fh, fontSize: 20, fontWeight: 600, margin: 0 }}>{stamouder ? `${stamouder.firstName} ${stamouder.lastName}` : "Tak"}</h1>
            <div style={{ fontSize: 13, color: C.txM }}>Familie {familyName}</div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={collapseAll} style={{ background: C.bgW, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, color: C.txL, cursor: "pointer", fontFamily: ff }}>▶ Alles inklappen</button>
          <button onClick={expandAll} style={{ background: C.bgW, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, color: C.txL, cursor: "pointer", fontFamily: ff }}>▼ Alles uitklappen</button>
        </div>
        {stamouder ? renderPerson(stamouder, 0) : <div style={{ textAlign: "center", padding: 40, color: C.txM }}>Geen stamouder gevonden.</div>}
      </div>
      <Modal open={!!modal} onClose={closeModal} title={modal?.type === "edit" ? "Naam bewerken" : modal?.type === "partner" ? "Partner toevoegen" : "Kind toevoegen"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input value={firstName} onChange={setFN} placeholder="Voornaam" autoFocus />
          <Input value={lastName} onChange={setLN} placeholder="Achternaam" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn onClick={handleSave} disabled={!firstName.trim()} style={{ flex: 1 }}>{modal?.type === "edit" ? "Opslaan" : "Toevoegen"}</Btn>
            <Btn variant="secondary" onClick={closeModal}>Annuleren</Btn>
          </div>
        </div>
      </Modal>
      <Modal open={!!deleting} onClose={() => setDel(null)} title="Verwijderen">
        <p style={{ color: C.txL, lineHeight: 1.5, marginBottom: 20 }}>Weet je het zeker? Dit verwijdert ook alle kinderen en partners eronder.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="danger" onClick={() => handleDelete(deleting)} style={{ flex: 1 }}>Ja, verwijderen</Btn>
          <Btn variant="secondary" onClick={() => setDel(null)}>Annuleren</Btn>
        </div>
      </Modal>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');`}</style>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [treeId, setTI] = useState(null);
  const [treeData, setTD] = useState(null);
  const [branch, setBr] = useState(null);
  const [screen, setSc] = useState("loading");

  useEffect(() => {
    initFirebase().then((ok) => {
      if (ok) {
        const p = new URLSearchParams(window.location.search);
        const t = p.get("tree");
        if (t) { setTI(t); setSc("overview"); return; }
        firebaseDb.ref("trees").once("value", (s) => {
          const d = s.val();
          if (d) { setTI(Object.keys(d)[0]); setSc("overview"); }
          else setSc("setup");
        });
      } else {
        setSc("setup");
      }
    });
  }, []);

  useEffect(() => {
    if (!useFirebase || !treeId) return;
    const r = firebaseDb.ref(`trees/${treeId}`);
    const h = (s) => { const d = s.val(); if (d) setTD(d); };
    r.on("value", h);
    return () => r.off("value", h);
  }, [treeId]);

  const handleSetup = (id, data) => {
    setTI(id); setTD(data); setSc("overview");
    if (useFirebase && firebaseDb) try { firebaseDb.ref(`trees/${id}`).set(data); } catch (e) {}
  };

  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: ff, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🌳</div>
        <div style={{ fontFamily: fh, fontSize: 22, color: C.tx }}>Stamboom laden...</div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');`}</style>
      </div>
    );
  }

  if (screen === "setup") return <SetupScreen onComplete={handleSetup} />;

  if (screen === "branch" && branch) {
    return (
      <BranchView treeData={treeData} branchId={branch} onBack={() => { setBr(null); setSc("overview"); }} onUpdateTree={setTD} treeId={treeId} />
    );
  }

  return (
    <OverviewScreen treeData={treeData} onOpenBranch={(id) => { setBr(id); setSc("branch"); }} />
  );
}
