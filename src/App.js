import { useState, useEffect, useRef } from "react";
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

let firebaseDb = null, firebaseStorage = null, useFirebase = false;

const initFirebase = () => new Promise((resolve) => {
  const s1 = document.createElement("script");
  s1.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
  s1.onload = () => {
    const s2 = document.createElement("script");
    s2.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js";
    s2.onload = () => {
      const s3 = document.createElement("script");
      s3.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js";
      s3.onload = () => {
        try {
          window.firebase.initializeApp(FIREBASE_CONFIG);
          firebaseDb = window.firebase.database();
          firebaseStorage = window.firebase.storage();
          useFirebase = true;
          resolve(true);
        } catch (e) { resolve(false); }
      };
      s3.onerror = () => resolve(false);
      document.head.appendChild(s3);
    };
    s2.onerror = () => resolve(false);
    document.head.appendChild(s2);
  };
  s1.onerror = () => resolve(false);
  document.head.appendChild(s1);
  setTimeout(() => resolve(false), 6000);
});

// ============================================================
// Image compression helper
// ============================================================
const compressImage = (file, maxWidth = 200) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

const uploadPhoto = async (personId, file) => {
  if (!firebaseStorage || !file) return null;
  const compressed = await compressImage(file);
  // Convert base64 to blob
  const res = await fetch(compressed);
  const blob = await res.blob();
  const ref = firebaseStorage.ref(`photos/${personId}.jpg`);
  await ref.put(blob);
  return await ref.getDownloadURL();
};

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
// Shared UI
// ============================================================
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(58,46,34,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.wh, borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(58,46,34,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
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

function Input({ value, onChange, placeholder, autoFocus, type = "text", style = {} }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} type={type}
      style={{ width: "100%", padding: "12px 16px", fontSize: 16, border: `2px solid ${C.bd}`, borderRadius: 10, fontFamily: ff, color: C.tx, background: C.bg, outline: "none", boxSizing: "border-box", ...style }}
      onFocus={(e) => (e.target.style.borderColor = C.a1)}
      onBlur={(e) => (e.target.style.borderColor = C.bd)}
    />
  );
}

// Small photo thumbnail component
function PhotoThumb({ src, size = 60 }) {
  if (!src) return null;
  return (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.bd}` }} />
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
      data.people[sId] = { id: sId, firstName: s.first.trim(), lastName: s.last.trim(), branchId: bId, familySide: side, partnerId: null, parentId: null, depth: 0, birthYear: "", photoURL: "" };
      let pId = null;
      if (s.pF.trim()) {
        pId = uid();
        data.people[pId] = { id: pId, firstName: s.pF.trim(), lastName: s.pL.trim(), branchId: bId, familySide: side, partnerId: sId, parentId: null, depth: 0, isPartnerOf: sId, birthYear: "", photoURL: "" };
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
function OverviewScreen({ treeData, onOpenBranch, onUpdateTree, treeId }) {
  if (!treeData) return null;
  const branches = Object.values(treeData.branches || {});
  const people = treeData.people || {};
  const total = Object.keys(people).length;
  const [exporting, setExporting] = useState(false);
  const [addModal, setAddModal] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pFirstName, setPFirstName] = useState("");
  const [pLastName, setPLastName] = useState("");

  const openAddStamouder = (side) => { setAddModal({ familySide: side }); setFirstName(""); setLastName(""); setPFirstName(""); setPLastName(""); };
  const closeAddModal = () => { setAddModal(null); };

  const handleAddStamouder = () => {
    if (!firstName.trim()) return;
    const bId = uid(), sId = uid();
    const newPeople = { ...treeData.people };
    newPeople[sId] = { id: sId, firstName: firstName.trim(), lastName: lastName.trim(), branchId: bId, familySide: addModal.familySide, partnerId: null, parentId: null, depth: 0, birthYear: "", photoURL: "" };
    let pId = null;
    if (pFirstName.trim()) {
      pId = uid();
      newPeople[pId] = { id: pId, firstName: pFirstName.trim(), lastName: pLastName.trim(), branchId: bId, familySide: addModal.familySide, partnerId: sId, parentId: null, depth: 0, isPartnerOf: sId, birthYear: "", photoURL: "" };
      newPeople[sId].partnerId = pId;
    }
    const newBranches = { ...treeData.branches, [bId]: { id: bId, stamouderId: sId, partnerId: pId, familySide: addModal.familySide } };
    const updated = { ...treeData, people: newPeople, branches: newBranches };
    onUpdateTree(updated);
    if (useFirebase) {
      firebaseDb.ref(`trees/${treeId}/people/${sId}`).set(newPeople[sId]);
      if (pId) firebaseDb.ref(`trees/${treeId}/people/${pId}`).set(newPeople[pId]);
      firebaseDb.ref(`trees/${treeId}/branches/${bId}`).set(newBranches[bId]);
    }
    closeAddModal();
  };

  const dirKids = (bId, sId) => Object.values(people).filter((p) => p.branchId === bId && p.parentId === sId && !p.isPartnerOf).sort((a, b) => {
    const ya = parseInt(a.birthYear) || 9999, yb = parseInt(b.birthYear) || 9999;
    return ya - yb;
  });
  const descCount = (bId) => Object.values(people).filter((p) => p.branchId === bId && p.depth > 0 && !p.isPartnerOf).length;
  const partnerOf = (pid) => { const p = people[pid]; return p?.partnerId ? people[p.partnerId] || null : null; };
  const kidsOf = (pid, bId) => Object.values(people).filter((p) => p.branchId === bId && p.parentId === pid && !p.isPartnerOf);

  // PDF Export
  const buildLines = (pid, bId, d = 0) => {
    const p = people[pid]; if (!p) return [];
    const partner = partnerOf(pid);
    const labels = ["Stamouder", "Kind", "Kleinkind", "Achterkleinkind"];
    let name = `${p.firstName} ${p.lastName}`.trim();
    if (p.birthYear) name += ` (${p.birthYear})`;
    if (partner) {
      let pName = `${partner.firstName} ${partner.lastName}`.trim();
      if (partner.birthYear) pName += ` (${partner.birthYear})`;
      name += `  &  ${pName}`;
    }
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

  // Card
  const Card = ({ branch, accent, bg, bgH }) => {
    const st = people[branch.stamouderId], pt = branch.partnerId ? people[branch.partnerId] : null;
    const kids = dirKids(branch.id, branch.stamouderId), cnt = descCount(branch.id);
    const [h, sH] = useState(false);
    return (
      <div onClick={() => onOpenBranch(branch.id)} onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
        style={{ background: h ? bgH : bg, borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s", border: `1px solid ${C.bd}`, boxShadow: `0 2px 8px ${C.sh}` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fh, fontSize: 18, fontWeight: 600, color: C.tx, marginBottom: 2 }}>{st ? `${st.firstName} ${st.lastName}`.trim() : "?"}</div>
            <div style={{ fontSize: 15, color: C.txL, marginBottom: 6 }}>& {pt ? `${pt.firstName} ${pt.lastName}`.trim() : "partner onbekend"}</div>
          </div>
          {st?.photoURL && <PhotoThumb src={st.photoURL} size={50} />}
        </div>
        {kids.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
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

  const Side = ({ list, name, accent, bg, bgH, familySide }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 4, height: 32, background: accent, borderRadius: 2 }} />
        <h2 style={{ fontFamily: fh, fontSize: 26, fontWeight: 700, color: C.tx, margin: 0 }}>Familie {name}</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {list.map((b) => (<Card key={b.id} branch={b} accent={accent} bg={bg} bgH={bgH} />))}
        <div onClick={() => openAddStamouder(familySide)} style={{
          borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s",
          border: `2px dashed ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100
        }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: accent }}>+ Stamouder toevoegen</span>
        </div>
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
        <Side list={branches.filter((b) => b.familySide === 1)} name={treeData.familyName1} accent={C.a1} bg={C.c1} bgH={C.c1h} familySide={1} />
        <Side list={branches.filter((b) => b.familySide === 2)} name={treeData.familyName2} accent={C.a2} bg={C.c2} bgH={C.c2h} familySide={2} />
      </div>

      <Modal open={!!addModal} onClose={closeAddModal} title="Stamouder toevoegen">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.txM, textTransform: "uppercase", letterSpacing: 1 }}>Stamouder</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input value={firstName} onChange={setFirstName} placeholder="Voornaam" autoFocus />
            <Input value={lastName} onChange={setLastName} placeholder="Achternaam" />
          </div>
          <div style={{ fontSize: 13, color: C.txM, marginTop: 4 }}>Partner (optioneel)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input value={pFirstName} onChange={setPFirstName} placeholder="Voornaam" />
            <Input value={pLastName} onChange={setPLastName} placeholder="Achternaam" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn onClick={handleAddStamouder} disabled={!firstName.trim()} style={{ flex: 1 }}>Toevoegen</Btn>
            <Btn variant="secondary" onClick={closeAddModal}>Annuleren</Btn>
          </div>
        </div>
      </Modal>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');`}</style>
    </div>
  );
}

// ============================================================
// BRANCH VIEW — with birthYear + photo
// ============================================================
function BranchView({ treeData, branchId, onBack, onUpdateTree, treeId }) {
  const [modal, setModal] = useState(null);
  const [firstName, setFN] = useState("");
  const [lastName, setLN] = useState("");
  const [birthYear, setBY] = useState("");
  const [deleting, setDel] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [uploading, setUploading] = useState(null); // personId being uploaded
  const fileInputRef = useRef(null);
  const [photoTarget, setPhotoTarget] = useState(null);

  if (!treeData?.branches?.[branchId]) return null;
  const branch = treeData.branches[branchId];
  const people = treeData.people || {};
  const familyName = branch.familySide === 1 ? treeData.familyName1 : treeData.familyName2;

  const openModal = (type, targetId, person) => {
    setModal({ type, targetId, person });
    setFN(person?.firstName || "");
    setLN(person?.lastName || "");
    setBY(person?.birthYear || "");
  };
  const closeModal = () => { setModal(null); setFN(""); setLN(""); setBY(""); };
  const getChildren = (pid) => Object.values(people).filter((p) => p.branchId === branchId && p.parentId === pid && !p.isPartnerOf).sort((a, b) => {
    const ya = parseInt(a.birthYear) || 9999, yb = parseInt(b.birthYear) || 9999;
    return ya - yb;
  });
  const getPartner = (pid) => { const p = people[pid]; return p?.partnerId ? people[p.partnerId] || null : null; };

  const updatePerson = (id, fields) => {
    const ex = treeData.people[id]; if (!ex) return;
    onUpdateTree({ ...treeData, people: { ...treeData.people, [id]: { ...ex, ...fields } } });
    if (useFirebase) firebaseDb.ref(`trees/${treeId}/people/${id}`).update(fields);
  };
  const setPerson = (id, data) => {
    onUpdateTree({ ...treeData, people: { ...treeData.people, [id]: data } });
    if (useFirebase) firebaseDb.ref(`trees/${treeId}/people/${id}`).set(data);
  };
  const removePerson = (id) => {
    const np = { ...treeData.people }; delete np[id];
    onUpdateTree({ ...treeData, people: np });
    if (useFirebase) firebaseDb.ref(`trees/${treeId}/people/${id}`).remove();
  };

  const handleSave = () => {
    if (!firstName.trim() || !modal) return;
    if (modal.type === "edit") {
      updatePerson(modal.person.id, { firstName: firstName.trim(), lastName: lastName.trim(), birthYear: birthYear.trim() });
    } else if (modal.type === "partner") {
      const nId = uid(), t = people[modal.targetId], d = t?.depth ?? 0;
      const newPartner = { id: nId, firstName: firstName.trim(), lastName: lastName.trim(), branchId, familySide: branch.familySide, partnerId: modal.targetId, isPartnerOf: modal.targetId, parentId: t?.parentId || null, depth: d, birthYear: birthYear.trim(), photoURL: "" };
      const updatedPeople = { ...treeData.people, [nId]: newPartner, [modal.targetId]: { ...treeData.people[modal.targetId], partnerId: nId } };
      onUpdateTree({ ...treeData, people: updatedPeople });
      if (useFirebase) { firebaseDb.ref(`trees/${treeId}/people/${nId}`).set(newPartner); firebaseDb.ref(`trees/${treeId}/people/${modal.targetId}/partnerId`).set(nId); }
    } else if (modal.type === "child") {
      const nId = uid(), par = people[modal.targetId], d = (par?.depth ?? 0) + 1;
      setPerson(nId, { id: nId, firstName: firstName.trim(), lastName: lastName.trim(), branchId, familySide: branch.familySide, partnerId: null, isPartnerOf: null, parentId: modal.targetId, depth: d, birthYear: birthYear.trim(), photoURL: "" });
    }
    closeModal();
  };

  const handleDelete = (pid) => {
    const p = people[pid]; if (!p) return;
    if (p.partnerId && people[p.partnerId]) { p.isPartnerOf ? updatePerson(p.partnerId, { partnerId: null }) : removePerson(p.partnerId); }
    for (const k of getChildren(pid)) handleDelete(k.id);
    removePerson(pid); setDel(null);
  };

  // Photo upload
  const triggerPhotoUpload = (personId) => {
    setPhotoTarget(personId);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !photoTarget) return;
    setUploading(photoTarget);
    try {
      const url = await uploadPhoto(photoTarget, file);
      if (url) updatePerson(photoTarget, { photoURL: url });
    } catch (err) {
      console.error("Photo upload error:", err);
    }
    setUploading(null);
    setPhotoTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleCollapse = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const collapseAll = () => { const a = {}; Object.values(people).forEach((p) => { if (p.branchId === branchId && !p.isPartnerOf && getChildren(p.id).length > 0) a[p.id] = true; }); setCollapsed(a); };
  const expandAll = () => setCollapsed({});
  const countDesc = (pid) => { let c = 0; for (const k of getChildren(pid)) { c += 1 + countDesc(k.id); } return c; };

  // Render a single person card
  const PersonCard = ({ person, depth, isPartner }) => {
    const gc = genColor(depth);
    const label = isPartner ? "partner" : genLabel(depth);
    const isUploadingThis = uploading === person.id;

    return (
      <div style={{ background: gc.bg, border: `2px solid ${gc.bd}`, borderRadius: 14, padding: 16, minWidth: 140, boxShadow: `0 2px 10px ${C.sh}`, maxWidth: 260 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div onClick={() => openModal("edit", null, person)}
              style={{ fontWeight: 600, fontSize: 17, color: C.tx, cursor: "pointer", marginBottom: 2, lineHeight: 1.3 }}>
              {person.firstName} {person.lastName}
            </div>
            <div style={{ fontSize: 11, color: C.txM, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {label}{person.birthYear ? ` · ${person.birthYear}` : ""}
            </div>
          </div>
          {person.photoURL ? (
            <div onClick={(e) => { e.stopPropagation(); triggerPhotoUpload(person.id); }} style={{ cursor: "pointer" }}>
              <PhotoThumb src={person.photoURL} size={56} />
            </div>
          ) : (
            <div onClick={(e) => { e.stopPropagation(); triggerPhotoUpload(person.id); }}
              style={{ width: 56, height: 56, borderRadius: 8, background: C.bgW, border: `1px dashed ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, color: C.txM }}>
              {isUploadingThis ? "⏳" : "📷"}
            </div>
          )}
        </div>
        {!isPartner && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {!getPartner(person.id) && <button onClick={(e) => { e.stopPropagation(); openModal("partner", person.id); }} style={{ background: C.bgW, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: C.txL, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>+ Partner</button>}
            <button onClick={(e) => { e.stopPropagation(); openModal("child", person.id); }} style={{ background: C.bgC, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: C.a2, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>+ Kind</button>
            {getChildren(person.id).length > 0 && <button onClick={(e) => { e.stopPropagation(); toggleCollapse(person.id); }} style={{ background: collapsed[person.id] ? "#E8E0D4" : C.bgW, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: C.tx, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>{collapsed[person.id] ? `▶ ${countDesc(person.id)}` : "▼"}</button>}
            {depth > 0 && <button onClick={(e) => { e.stopPropagation(); setDel(person.id); }} style={{ background: C.dngL, border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.dng, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>✕</button>}
          </div>
        )}
        {isPartner && (
          <div style={{ marginTop: 10 }}>
            <button onClick={(e) => { e.stopPropagation(); setDel(person.id); }} style={{ background: C.dngL, border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.dng, cursor: "pointer", fontFamily: ff, minHeight: 36 }}>✕</button>
          </div>
        )}
      </div>
    );
  };

  const renderPerson = (person, depth = 0) => {
    if (!person) return null;
    const partner = getPartner(person.id);
    const children = getChildren(person.id);
    const isC = collapsed[person.id] && children.length > 0;
    const descN = children.length > 0 ? countDesc(person.id) : 0;

    return (
      <div key={person.id} style={{ marginTop: depth > 0 ? 16 : 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <PersonCard person={person} depth={depth} isPartner={false} />
          {partner && (
            <>
              <div style={{ display: "flex", alignItems: "center", alignSelf: "center" }}><div style={{ width: 24, height: 2, background: C.ln }} /></div>
              <PersonCard person={partner} depth={depth} isPartner={true} />
            </>
          )}
        </div>
        {children.length > 0 && !isC && (
          <div style={{ marginLeft: 22, paddingLeft: 22, borderLeft: `2px solid ${C.ln}`, marginTop: 8 }}>
            {children.map((ch) => renderPerson(ch, depth + 1))}
          </div>
        )}
        {isC && (
          <div onClick={() => toggleCollapse(person.id)} style={{ marginLeft: 22, paddingLeft: 22, borderLeft: `2px dashed ${C.bd}`, marginTop: 8, padding: "8px 16px", color: C.txM, fontSize: 13, cursor: "pointer", fontStyle: "italic" }}>
            {descN} {descN === 1 ? "nakomeling" : "nakomelingen"} verborgen — tik om te tonen
          </div>
        )}
      </div>
    );
  };

  const stamouder = people[branch.stamouderId];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: ff, color: C.tx }}>
      {/* Hidden file input for photo uploads */}
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoSelected} style={{ display: "none" }} />

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

      {/* Add/Edit Modal — now with birthYear */}
      <Modal open={!!modal} onClose={closeModal} title={modal?.type === "edit" ? "Bewerken" : modal?.type === "partner" ? "Partner toevoegen" : "Kind toevoegen"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input value={firstName} onChange={setFN} placeholder="Voornaam" autoFocus />
          <Input value={lastName} onChange={setLN} placeholder="Achternaam" />
          <Input value={birthYear} onChange={setBY} placeholder="Geboortejaar (bijv. 1974)" type="number" style={{ maxWidth: 200 }} />
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
    <OverviewScreen treeData={treeData} onOpenBranch={(id) => { setBr(id); setSc("branch"); }} onUpdateTree={setTD} treeId={treeId} />
  );
}
