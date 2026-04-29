import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";

const AppCtx = createContext(null);

// --- Google Fonts ---
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";
if (typeof document !== "undefined" && !document.querySelector(`link[href="${FONT_HREF}"]`)) {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = FONT_HREF;
  document.head.appendChild(fontLink);
}

// --- QR Code Generator (simple SVG-based) ---
function generateQRMatrix(text) {
  const size = 21;
  const matrix = Array(size).fill(null).map(() => Array(size).fill(false));
  const addFinder = (r, c) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4))
        if (r + i < size && c + j < size) matrix[r + i][c + j] = true;
    }
  };
  addFinder(0, 0); addFinder(0, 14); addFinder(14, 0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  let seed = Math.abs(hash);
  for (let i = 8; i < size; i++) for (let j = 8; j < size; j++) {
    if (i < 14 || j < 14) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; matrix[i][j] = seed % 3 === 0; }
  }
  for (let i = 8; i < 13; i++) { matrix[6][i] = i % 2 === 0; matrix[i][6] = i % 2 === 0; }
  return matrix;
}

function QRCode({ text, size = 120 }) {
  const matrix = generateQRMatrix(text || "VINTAGE");
  const cellSize = size / 21;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="4" />
      {matrix.map((row, i) => row.map((cell, j) => cell ? (
        <rect key={`${i}-${j}`} x={j * cellSize + 0.5} y={i * cellSize + 0.5} width={cellSize - 0.3} height={cellSize - 0.3} fill="#1a1a1a" rx="0.5" />
      ) : null))}
    </svg>
  );
}

function QRLabelsView() {
  const { garments, events, selectedId, navigate, styles, fonts, accent, textSecondary, border, softSage } = useApp();
  // If selectedId points to an event, scope to that event's assigned pieces.
  const scopedEvent = selectedId ? events.find(e => e.id === selectedId) : null;
  const list = scopedEvent
    ? garments.filter(g => (scopedEvent.garmentIds || []).includes(g.id))
    : garments;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
        <div>
          <h1 style={styles.h1}>QR Labels</h1>
          <p style={styles.subtitle}>
            {scopedEvent
              ? <>For <strong>{scopedEvent.name}</strong> — {list.length} piece{list.length !== 1 ? "s" : ""}. Each QR code encodes the garment's SKU.</>
              : <>Print these for your hang tags. Each QR code encodes the garment's SKU.</>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {scopedEvent && (
            <button style={styles.btnOutline} onClick={() => navigate("qr-labels")}>Show all</button>
          )}
          <button style={styles.btnOutline} onClick={() => window.print()}>↓ Print</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px", marginTop: "20px" }}>
        {list.map(g => (
          <div key={g.id} style={{ ...styles.card, textAlign: "center", padding: "24px 16px" }}>
            <QRCode text={g.sku} size={140} />
            <div style={{ marginTop: "12px", fontFamily: fonts, fontSize: "14px", fontWeight: 400 }}>{g.name}</div>
            <div style={{ fontSize: "11px", color: textSecondary, letterSpacing: "0.04em", marginTop: "2px" }}>{g.sku}</div>
            <div style={{ fontSize: "13px", color: accent, fontFamily: fonts, marginTop: "4px" }}>${(g.price || 0).toFixed(0)}</div>
            <div style={{ fontSize: "11px", color: textSecondary, marginTop: "2px" }}>{g.era} · {g.size}</div>
          </div>
        ))}
      </div>
      {list.length === 0 && (
        <p style={{ textAlign: "center", color: textSecondary, padding: "40px" }}>
          {scopedEvent ? "No garments assigned to this event yet." : "Add garments to generate QR labels."}
        </p>
      )}
    </div>
  );
}

// --- Constants ---
const ERAS = ["1830s", "1840s", "1850s", "1860s", "1870s", "1880s", "1890s", "1900s", "1910s", "1920s", "1930s", "1940s", "1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "Unknown"];
const CATEGORIES = ["Dresses", "Tops & Blouses", "Skirts", "Pants & Trousers", "Outerwear", "Accessories", "Shoes", "Jewelry", "Bags", "Hats", "Lingerie & Slips", "Suits & Sets"];
const CONDITIONS = ["Mint", "Excellent", "Good", "Fair", "Needs Repair"];
const REPAIR_STATUSES = ["None Needed", "Pending Assessment", "In Repair", "At Tailor", "Completed", "Not Worth Repairing"];
const GARMENT_STATUSES = ["In Collection", "Listed for Sale", "Reserved", "Sold", "On Display", "In Storage", "Lent Out"];
const EVENT_STATUSES = ["Planning", "Confirmed", "Active", "Completed", "Cancelled"];
const SOURCES = ["Estate Sale", "Thrift Store", "Flea Market", "Online Auction", "Private Seller", "Inherited", "Consignment", "Trade", "Gift", "Other"];
const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "One Size", "Custom/Altered"];

const SAMPLE_EVENTS = [
  { id: "evt-1", name: "Spring Flea at RiNo", location: "RiNo Art District, Denver", date: "2026-05-10", endDate: "2026-05-11", status: "Confirmed", boothFee: 175, travelCost: 20, suppliesCost: 45, otherFees: 0, feeNotes: "Booth #14 — paid deposit in March. Need to bring garment rack, steamer, hangers.", notes: "Outdoor event, weather dependent. Collab with local jeweler for cross-promotion.", garmentIds: ["g-1", "g-3"] },
  { id: "evt-2", name: "Vintage Bridal Pop-Up", location: "The Dairy Block, Denver", date: "2026-06-22", endDate: "", status: "Planning", boothFee: 250, travelCost: 10, suppliesCost: 80, otherFees: 30, feeNotes: "Shared indoor space — splitting with Wild Rose Florals. $30 for extra display table rental.", notes: "Focus on whites, creams, pastels. Need to coordinate decor with Sarah.", garmentIds: ["g-2"] },
];

const SAMPLE_GARMENTS = [
  { id: "g-1", sku: "VTG-1960-D-001", name: "Emerald Silk Shift Dress", era: "1960s", category: "Dresses", size: "S", condition: "Excellent", repairStatus: "None Needed", status: "In Collection", price: 185, cost: 45, sourceAskingPrice: 65, flaws: "Faint watermark near left hem, approximately 1 inch — barely visible. No structural damage.", countryOfOrigin: "USA", source: "Estate Sale", sourceDetail: "Found at the Morrison estate sale, Feb 2026. The family said it belonged to their grandmother who wore it to cocktail parties in Cherry Hills.", story: "A gorgeous emerald green silk shift with a subtle sheen. The cut is pure 60s minimalism — clean lines, no darts, falling just above the knee. The label reads 'Bonwit Teller' which places it in the upper echelon of department store fashion of the era. There's a tiny monogram 'E.M.' stitched inside the neckline.", materials: "Silk", colors: "Emerald Green", brand: "Bonwit Teller", measurements: 'Bust 34", Waist 30", Length 36"', photos: [{ id: "p1", url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400", caption: "Front view — natural light" }, { id: "p2", url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400", caption: "Bonwit Teller label detail" }], notes: "Photograph against cream backdrop — the green really pops. Would pair beautifully with gold jewelry for display.", dateAcquired: "2026-02-14", tags: ["cocktail", "silk", "60s mod", "designer label"] },
  { id: "g-2", name: "Ivory Lace Tea Dress", sku: "VTG-1940-D-002", era: "1940s", category: "Dresses", size: "XS", condition: "Good", repairStatus: "In Repair", status: "In Collection", price: 240, cost: 30, sourceAskingPrice: 4.99, flaws: "Two small tears in lace overlay near hem — currently at tailor. Pearl button on back neckline has minor chip, not visible when worn.", countryOfOrigin: "Unknown / Possibly European", source: "Thrift Store", sourceDetail: "Goodwill on Broadway, buried in the back rack. The lace overlay is handmade — you can see slight irregularities that prove it. $4.99 price tag still on it!", story: "1940s ivory lace tea-length dress with a sweetheart neckline. The lace overlay is handmade with a floral motif — likely European given the technique. Three small pearl buttons up the back. The kind of dress someone wore to their engagement party or a summer garden wedding. There's a faint lavender sachet scent still clinging to the fabric.", materials: "Cotton Lace, Silk Lining", colors: "Ivory, Cream", brand: "Unknown / Handmade", measurements: 'Bust 32", Waist 24", Length 42"', photos: [{ id: "p3", url: "https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=400", caption: "Full dress on hanger" }], notes: "Lace has two small tears near the hem — at tailor for mending. Could fetch $300+ once repaired.", dateAcquired: "2026-01-20", tags: ["bridal", "lace", "handmade", "romantic", "40s"] },
  { id: "g-3", name: "Rust Corduroy Blazer", sku: "VTG-1970-O-003", era: "1970s", category: "Outerwear", size: "M", condition: "Excellent", repairStatus: "Completed", status: "Listed for Sale", price: 120, cost: 15, sourceAskingPrice: 22, flaws: "One original button replaced — close match, nearly identical. Elbow patches re-stitched but all original leather intact.", countryOfOrigin: "USA", source: "Flea Market", sourceDetail: "Picked up at the Alameda Antique Fair from the guy who always has the good menswear. He said it came from a professor's closet cleanout.", story: "Wide-wale rust corduroy blazer with beautiful patch pockets and elbow patches in camel suede. The lining is a surprise — a paisley print in burgundy and gold. It has that broken-in, lived-in feel that you simply cannot replicate. Two-button closure, slightly nipped waist. The kind of blazer that makes everyone ask 'where did you get that?'", materials: "Corduroy, Suede Patches, Paisley Lining", colors: "Rust, Camel, Burgundy", brand: "Harris Tweed — USA Line", measurements: 'Chest 40", Shoulders 18", Length 28"', photos: [{ id: "p4", url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400", caption: "Front — patch pockets" }, { id: "p5", url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400", caption: "Paisley lining detail" }, { id: "p6", url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400", caption: "Suede elbow patch" }], notes: "Had a missing button — replaced with a close match. Elbow patches restitched. Ready to sell.", dateAcquired: "2025-11-03", tags: ["unisex", "academic", "corduroy", "70s", "blazer"] },
];

// --- Helpers ---
const genId = () => "id-" + Math.random().toString(36).substr(2, 9);
const genSKU = (era, category) => {
  const eraCode = (era || "").replace(/s$/, "").replace(/[^0-9]/g, "") || "XXXX";
  const catCode = (category || "XX").substring(0, 1).toUpperCase();
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `VTG-${eraCode}-${catCode}-${num}`;
};

const statusColor = (s) => {
  const map = { "In Collection": "#7A5C3A", "Listed for Sale": "#1D6B6B", "Reserved": "#C9820A", "Sold": "#3A7A3A", "On Display": "#6B3A7A", "In Storage": "#7A5C3A", "Lent Out": "#A52A0A", "Mint": "#3A7A3A", "Excellent": "#1D6B6B", "Good": "#C9820A", "Fair": "#D4622A", "Needs Repair": "#A52A0A", "None Needed": "#7A5C3A", "Pending Assessment": "#C9820A", "In Repair": "#D4622A", "At Tailor": "#6B3A7A", "Completed": "#3A7A3A", "Not Worth Repairing": "#A52A0A", "Planning": "#C9820A", "Confirmed": "#1D6B6B", "Active": "#3A7A3A", "Cancelled": "#A52A0A" };
  return map[s] || "#7A5C3A";
};

const Badge = ({ children, color }) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "1px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", background: (color || "#6b7280") + "18", color: color || "#6b7280", border: `1px solid ${(color || "#6b7280")}30`, whiteSpace: "nowrap", textTransform: "uppercase" }}>{children}</span>
);

const formatCurrency = (n) => typeof n === "number" ? `$${n.toFixed(0)}` : "—";
const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const formatDateRange = (start, end) => {
  if (!start) return "—";
  const s = new Date(start + "T00:00:00");
  if (!end) return s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const e = new Date(end + "T00:00:00");
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${e.getDate()}, ${e.getFullYear()}`;
  if (s.getFullYear() === e.getFullYear())
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
};
const daysUntil = (d) => { if (!d) return Infinity; return Math.ceil((new Date(d + "T00:00:00") - new Date()) / 86400000); };
const todayISO = () => new Date().toISOString().split("T")[0];

// Safely convert an <input type="number"> value to a number, treating
// empty string and NaN as 0 (so clearing the input doesn't store NaN).
const parseNum = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// --- Schema templates ---
// Used both for fresh records and for normalizing records loaded from
// localStorage. When new fields are added to the model, old saved data
// won't have them — normalizing on load fills them with safe defaults
// so display and write paths can rely on every field being present.
const GARMENT_TEMPLATE = {
  id: "", sku: "", name: "", era: "Unknown", category: "Dresses", size: "M",
  condition: "Good", repairStatus: "None Needed", status: "In Collection",
  price: 0, cost: 0, sourceAskingPrice: 0, finalSalePrice: 0, saleNote: "",
  flaws: "", countryOfOrigin: "", source: "Other", sourceDetail: "", story: "",
  materials: "", colors: "", brand: "", measurements: "",
  photos: [], notes: "", dateAcquired: "", tags: [],
};
const EVENT_TEMPLATE = {
  id: "", name: "", location: "", date: "", endDate: "", status: "Planning",
  boothFee: 0, travelCost: 0, suppliesCost: 0, otherFees: 0,
  feeNotes: "", notes: "", garmentIds: [],
};
const normalizeGarment = (g) => ({
  ...GARMENT_TEMPLATE, ...g,
  photos: Array.isArray(g?.photos) ? g.photos : [],
  tags: Array.isArray(g?.tags) ? g.tags : [],
});
const normalizeEvent = (e) => ({
  ...EVENT_TEMPLATE, ...e,
  garmentIds: Array.isArray(e?.garmentIds) ? e.garmentIds : [],
});
const emptyGarment = () => ({ ...GARMENT_TEMPLATE, id: genId(), dateAcquired: todayISO(), photos: [], tags: [] });
const emptyEvent = () => ({ ...EVENT_TEMPLATE, id: genId(), date: todayISO(), garmentIds: [] });

// --- CSV / export helpers ---
// Quote a value for CSV: wrap in quotes only if it contains a separator,
// quote, or newline. Doubles up internal quotes per RFC 4180.
const csvQuote = (val, separator = ",") => {
  const s = val == null ? "" : String(val);
  if (separator === "," && (s.includes(",") || s.includes('"') || s.includes("\n")))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
};

// Compose a buyer-friendly description that combines era, materials, brand,
// condition, measurements, flaws, and the story. Tries to keep it scannable.
const garmentDescription = (g) => {
  const parts = [];
  const meta = [g.era, g.brand, g.materials].filter(Boolean).join(" · ");
  if (meta) parts.push(meta);
  if (g.measurements) parts.push(g.measurements);
  if (g.condition) parts.push(`Condition: ${g.condition}`);
  if (g.flaws) parts.push(`Notes: ${g.flaws}`);
  if (g.story) parts.push(g.story);
  return parts.join(". ");
};

// Build a Square Item Library import-compatible CSV.
// Required columns per Square docs: Item Name, Variation Name, Description, SKU.
// We add Price, Categories, and Item Type so it lands ready-to-sell. Square
// is forgiving about extra columns; missing required ones cause import errors.
// See: https://squareup.com/help/us/en/article/5153-import-items-online
const buildSquareCSV = (garments) => {
  const headers = [
    "Item Name", "Variation Name", "Unit and Precision",
    "SKU", "Description", "Categories",
    "Price", "Enabled", "Item Type",
  ];
  const rows = garments.map(g => [
    g.name || "Untitled garment",
    "Regular",     // Variation Name — required even if there's only one
    "",            // Unit and Precision — blank means "each"
    g.sku || "",
    garmentDescription(g),
    g.category || "",
    (g.price || 0).toFixed(2),
    "Y",           // Enabled — Y means available for sale
    "Physical Good",
  ]);
  return [headers.map(c => csvQuote(c)).join(","), ...rows.map(r => r.map(c => csvQuote(c)).join(","))].join("\n");
};

const downloadCSV = (text, filename) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// --- Full-data JSON backup ---
// A single-file snapshot of everything stored in localStorage. The format
// is intentionally simple and human-readable so you can open it in any text
// editor, sanity-check it, edit it by hand if needed, and email it around.
//
// Schema is versioned (BACKUP_VERSION) so future versions can detect older
// files and run migrations. Today the only "migration" we need is the
// existing normalize* helpers, which fill in any new fields with defaults.
const BACKUP_VERSION = 1;
const APP_NAME = "Megan's Marvels";

const buildBackupJSON = (garments, events) => {
  const data = {
    _meta: {
      version: BACKUP_VERSION,
      appName: APP_NAME,
      exportedAt: new Date().toISOString(),
      garmentCount: garments.length,
      eventCount: events.length,
    },
    garments,
    events,
  };
  return JSON.stringify(data, null, 2);
};

const downloadJSON = (text, filename) => {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// Parse and validate a backup file. Returns { ok, garments, events, meta, error }
// where error is a human-readable string when ok is false.
const parseBackup = (text) => {
  let raw;
  try { raw = JSON.parse(text); }
  catch { return { ok: false, error: "That doesn't look like a valid backup file (it's not valid JSON)." }; }
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "That backup file is empty or unreadable." };
  }
  if (!Array.isArray(raw.garments) || !Array.isArray(raw.events)) {
    return { ok: false, error: "That backup is missing 'garments' or 'events' — are you sure it's a backup from this app?" };
  }
  // Run loaded records through the same normalizers we use on app load so
  // missing fields get filled in safely.
  const garments = raw.garments.map(normalizeGarment);
  const events = raw.events.map(normalizeEvent);
  return { ok: true, garments, events, meta: raw._meta || null };
};

// --- Convenience hook for views ---
function useApp() {
  return useContext(AppCtx);
}

// ============================================================
// MODULE-LEVEL COMPONENTS
// IMPORTANT: All view components live at module scope (not inside
// another component). Defining components inside a parent re-creates
// their function references on every render, which causes React to
// unmount and remount them — destroying their internal state and
// making inputs lose focus after every keystroke.
// ============================================================

function Field({ label: l, children, span, hint }) {
  const { styles, accentLight } = useContext(AppCtx);
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={styles.label}>{l}</label>
      {children}
      {hint && <div style={{ fontSize: "11px", color: accentLight, marginTop: "4px", fontStyle: "italic" }}>{hint}</div>}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle: sub, action, actionLabel }) {
  const { styles, border, textSecondary, accent } = useContext(AppCtx);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "14px", marginTop: "10px", borderBottom: `1px solid ${border}`, paddingBottom: "8px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: accent }}>{icon}</span>
          <h2 style={{ ...styles.h2, marginBottom: 0 }}>{title}</h2>
        </div>
        {sub && <p style={{ color: textSecondary, fontSize: "11px", margin: "2px 0 0", fontStyle: "italic" }}>{sub}</p>}
      </div>
      {action && <button style={{ ...styles.btnOutline, fontSize: "11px", padding: "5px 12px" }} onClick={action}>{actionLabel}</button>}
    </div>
  );
}

function SectionWrap({ children, hint }) {
  const { textSecondary, border } = useContext(AppCtx);
  return (
    <div style={{ paddingTop: "8px" }}>
      {hint && <p style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginBottom: "18px", lineHeight: 1.6, borderLeft: `2px solid ${border}`, paddingLeft: "10px" }}>{hint}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        {children}
      </div>
    </div>
  );
}

function GarmentForm() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useContext(AppCtx);
  const [form, setForm] = useState(() => editingGarment ? normalizeGarment(editingGarment) : emptyGarment());
  const [tagInput, setTagInput] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoCaptionInput, setPhotoCaptionInput] = useState("");
  const [activeSection, setActiveSection] = useState("identity");
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addTag = () => { const t = tagInput.trim().toLowerCase(); const cur = form.tags || []; if (t && !cur.includes(t)) { upd("tags", [...cur, t]); setTagInput(""); } };
  const removeTag = (t) => upd("tags", (form.tags || []).filter(x => x !== t));
  const addPhoto = () => { if (photoUrlInput.trim()) { upd("photos", [...(form.photos || []), { id: "ph-" + Math.random().toString(36).substr(2, 6), url: photoUrlInput.trim(), caption: photoCaptionInput.trim() }]); setPhotoUrlInput(""); setPhotoCaptionInput(""); } };
  const removePhoto = (pid) => upd("photos", (form.photos || []).filter(p => p.id !== pid));
  const movePhoto = (idx, dir) => { const arr = [...(form.photos || [])]; const ni = idx + dir; if (ni < 0 || ni >= arr.length) return; [arr[idx], arr[ni]] = [arr[ni], arr[idx]]; upd("photos", arr); };
  const nameInputRef = useRef(null);
  useEffect(() => { if (nameInputRef.current) nameInputRef.current.focus(); }, []);
  const isSold = form.status === "Sold";
  const isEdit = garments.some(g => g.id === form.id);
  const discount = isSold && form.finalSalePrice > 0 && form.price > 0
    ? Math.round((1 - form.finalSalePrice / form.price) * 100)
    : 0;
  const margin = isSold && form.finalSalePrice > 0 && form.cost > 0
    ? form.finalSalePrice - form.cost
    : null;

  const sections = [
    { id: "identity", label: "Identity" },
    { id: "details", label: "Details" },
    { id: "provenance", label: "Provenance" },
    { id: "pricing", label: "Pricing" },
    { id: "photos", label: "Photos" },
    { id: "notes", label: "Notes & Tags" },
  ];

  const navDot = (id) => {
    const visited = sections.findIndex(s => s.id === id) <= sections.findIndex(s => s.id === activeSection);
    const isActive = id === activeSection;
    return (
      <button key={id} onClick={() => setActiveSection(id)} style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
        background: "none", border: "none", cursor: "pointer", padding: "4px 10px",
        borderBottom: isActive ? `2px solid ${accent}` : "2px solid transparent",
        transition: "border-color 0.15s",
      }}>
        <span style={{ fontSize: "11px", fontWeight: isActive ? 700 : 400, color: isActive ? accent : textSecondary, fontFamily: bodyFont, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {sections.find(s => s.id === id).label}
        </span>
      </button>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <button style={styles.backBtn} onClick={() => navigate(isEdit ? "garment-detail" : "inventory", isEdit ? form.id : null)}>← {isEdit ? "Back to garment" : "Back to inventory"}</button>
          <h1 style={{ ...styles.h1, marginBottom: "2px" }}>{isEdit ? "Edit" : "Add New"} Garment</h1>
          {form.name && form.name.trim().length > 3 && <p style={{ fontFamily: fonts, fontSize: "13px", color: textSecondary, fontStyle: "italic", margin: "2px 0 0", letterSpacing: "0.01em" }}>— {form.name}</p>}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button style={styles.btnOutline} onClick={() => navigate(isEdit ? "garment-detail" : "inventory", isEdit ? form.id : null)}>Discard</button>
          <button style={styles.btn} onClick={() => saveGarment(form)}>{isEdit ? "Save Changes" : "Add to Collection"}</button>
        </div>
      </div>

      {/* Section tab nav */}
      <div style={{ display: "flex", gap: "0", marginBottom: "24px", borderBottom: `1px solid ${border}`, overflowX: "auto" }}>
        {sections.map(s => navDot(s.id))}
      </div>

      {/* ── IDENTITY ── */}
      {activeSection === "identity" && (
        <div style={styles.card}>
          <SectionWrap hint="Start with the name — make it evocative, not just descriptive. Then lock in the classification so it's searchable.">
            <Field label="Garment Name" span={2}>
              <input ref={nameInputRef} style={{ ...styles.input, fontSize: "15px", fontFamily: fonts, fontStyle: "italic" }} value={form.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. Emerald Silk Shift Dress" />
            </Field>
            <Field label="SKU" hint="Leave blank to auto-generate on save">
              <input style={styles.input} value={form.sku} onChange={e => upd("sku", e.target.value)} placeholder="VTG-1960-D-001" />
            </Field>
            <Field label="Era">
              <select style={styles.select} value={form.era} onChange={e => upd("era", e.target.value)}>{ERAS.map(e => <option key={e}>{e}</option>)}</select>
            </Field>
            <Field label="Category">
              <select style={styles.select} value={form.category} onChange={e => upd("category", e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Size">
              <select style={styles.select} value={form.size} onChange={e => upd("size", e.target.value)}>{SIZES.map(s => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Brand / Label">
              <input style={styles.input} value={form.brand} onChange={e => upd("brand", e.target.value)} placeholder="e.g. Bonwit Teller, Unknown" />
            </Field>
            <Field label="Country of Origin" hint="From label or provenance">
              <input style={styles.input} value={form.countryOfOrigin || ""} onChange={e => upd("countryOfOrigin", e.target.value)} placeholder="e.g. France, USA, Unknown" />
            </Field>
          </SectionWrap>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button style={styles.btn} onClick={() => setActiveSection("details")}>Continue to Details →</button>
          </div>
        </div>
      )}

      {/* ── DETAILS ── */}
      {activeSection === "details" && (
        <div style={styles.card}>
          <SectionWrap hint="Physical specifics — what a careful buyer asks about. Measurements help online, materials justify your price, flaws prevent surprises.">
            <Field label="Colors">
              <input style={styles.input} value={form.colors} onChange={e => upd("colors", e.target.value)} placeholder="e.g. Emerald Green, Gold trim" />
            </Field>
            <Field label="Materials">
              <input style={styles.input} value={form.materials} onChange={e => upd("materials", e.target.value)} placeholder="e.g. Silk charmeuse, Cotton lace" />
            </Field>
            <Field label="Measurements" span={2}>
              <input style={styles.input} value={form.measurements} onChange={e => upd("measurements", e.target.value)} placeholder='e.g. Bust 34", Waist 30", Length 36"' />
            </Field>
            <Field label="Condition">
              <select style={styles.select} value={form.condition} onChange={e => upd("condition", e.target.value)}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Repair Status">
              <select style={styles.select} value={form.repairStatus} onChange={e => upd("repairStatus", e.target.value)}>{REPAIR_STATUSES.map(r => <option key={r}>{r}</option>)}</select>
            </Field>
            <Field label="Flaws & Condition Notes" span={2}>
              <textarea style={{ ...styles.textarea, minHeight: "80px" }} value={form.flaws || ""} onChange={e => upd("flaws", e.target.value)} placeholder="Any damage, wear, alterations, missing buttons, fading, or previous repairs. Honest details help with pricing and build buyer trust." />
            </Field>
          </SectionWrap>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
            <button style={styles.btnOutline} onClick={() => setActiveSection("identity")}>← Identity</button>
            <button style={styles.btn} onClick={() => setActiveSection("provenance")}>Continue to Provenance →</button>
          </div>
        </div>
      )}

      {/* ── PROVENANCE ── */}
      {activeSection === "provenance" && (
        <div style={styles.card}>
          <SectionWrap hint="The story is part of what you're selling. Where did it come from? What did the seller tell you? What do you notice about it that a stranger wouldn't?">
            <Field label="Source Type">
              <select style={styles.select} value={form.source} onChange={e => upd("source", e.target.value)}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Source Name & Location" hint="e.g. 'Morrison Estate Sale, Cherry Hills'">
              <input style={styles.input} value={form.sourceDetail} onChange={e => upd("sourceDetail", e.target.value)} placeholder="Who / where?" />
            </Field>
            <Field label="Date Acquired">
              <input style={styles.input} type="date" value={form.dateAcquired} onChange={e => upd("dateAcquired", e.target.value)} />
            </Field>
            <Field label="The Garment's Story" span={2}>
              <textarea style={{ ...styles.textarea, minHeight: "140px" }} value={form.story} onChange={e => upd("story", e.target.value)} placeholder="What drew you to this piece? What do you know of its history? What would you tell someone who picks it up? This is what makes your collection different from a rack at a flea market." />
            </Field>
          </SectionWrap>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
            <button style={styles.btnOutline} onClick={() => setActiveSection("details")}>← Details</button>
            <button style={styles.btn} onClick={() => setActiveSection("pricing")}>Continue to Pricing →</button>
          </div>
        </div>
      )}

      {/* ── PRICING ── */}
      {activeSection === "pricing" && (
        <div>
          {/* Garment status */}
          <div style={{ ...styles.card, marginBottom: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Garment Status">
                <select style={styles.select} value={form.status} onChange={e => upd("status", e.target.value)}>{GARMENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label="Date Acquired">
                <input style={styles.input} type="date" value={form.dateAcquired} onChange={e => upd("dateAcquired", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Acquisition pricing */}
          <div style={styles.card}>
            <h3 style={{ ...styles.h3, marginBottom: "4px" }}>Acquisition</h3>
            <p style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginBottom: "14px", lineHeight: 1.6 }}>What the source asked vs. what you actually paid. The gap is your negotiating record — and useful context when you price the piece.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Source's Listed Price" hint="What they originally asked">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: textSecondary, fontSize: "13px" }}>$</span>
                  <input style={{ ...styles.input, paddingLeft: "22px" }} type="number" min="0" step="0.01" value={form.sourceAskingPrice || ""} onChange={e => upd("sourceAskingPrice", parseNum(e.target.value))} placeholder="0.00" />
                </div>
              </Field>
              <Field label="What You Paid">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: textSecondary, fontSize: "13px" }}>$</span>
                  <input style={{ ...styles.input, paddingLeft: "22px" }} type="number" min="0" step="0.01" value={form.cost || ""} onChange={e => upd("cost", parseNum(e.target.value))} placeholder="0.00" />
                </div>
              </Field>
            </div>
            {form.sourceAskingPrice > 0 && form.cost > 0 && form.cost < form.sourceAskingPrice && (
              <div style={{ marginTop: "10px", padding: "8px 12px", background: `${teal}0f`, border: `1px solid ${teal}30`, borderLeft: `3px solid ${teal}`, fontSize: "12px", color: teal, fontStyle: "italic" }}>
                You negotiated {Math.round((1 - form.cost / form.sourceAskingPrice) * 100)}% off the listed price.
              </div>
            )}
          </div>

          {/* Asking price */}
          <div style={styles.card}>
            <h3 style={{ ...styles.h3, marginBottom: "4px" }}>Your Price</h3>
            <p style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginBottom: "14px", lineHeight: 1.6 }}>What you're listing it for. Consider condition, era, label, your cost, and what you know about the market.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "end" }}>
              <Field label="Asking Price">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: textSecondary, fontSize: "13px" }}>$</span>
                  <input style={{ ...styles.input, paddingLeft: "22px", fontFamily: fonts, fontSize: "16px", fontWeight: 700, color: accent }} type="number" min="0" step="0.01" value={form.price || ""} onChange={e => upd("price", parseNum(e.target.value))} placeholder="0.00" />
                </div>
              </Field>
              {form.cost > 0 && form.price > 0 && (
                <div style={{ padding: "10px 14px", background: `${softSage}12`, border: `1px solid ${softSage}30`, borderLeft: `3px solid ${softSage}`, fontSize: "12px", color: softSage }}>
                  <span style={{ fontWeight: 700, fontSize: "15px" }}>{Math.round((form.price / form.cost - 1) * 100)}%</span> markup · {formatCurrency(form.price - form.cost)} margin
                </div>
              )}
            </div>
          </div>

          {/* Final sale — shown always but highlighted when Sold */}
          <div style={{ ...styles.card, borderTopColor: isSold ? "#3A7A3A" : border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px", flexWrap: "wrap", gap: "8px" }}>
              <h3 style={{ ...styles.h3, marginBottom: 0, color: isSold ? "#3A7A3A" : textPrimary }}>Final Sale</h3>
              {!isSold && <span style={{ fontSize: "11px", color: textSecondary, fontStyle: "italic" }}>Fill in when the piece sells</span>}
              {isSold && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Undo this sale? Status will go back to In Collection and the sale price/note will be cleared.")) return;
                    setForm(f => ({ ...f, status: "In Collection", finalSalePrice: 0, saleNote: "" }));
                  }}
                  style={{ background: "none", border: "none", color: warmRose, cursor: "pointer", fontSize: "11px", fontFamily: bodyFont, textDecoration: "underline", padding: 0 }}
                >
                  ↶ Undo this sale
                </button>
              )}
            </div>
            <p style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginBottom: "14px", lineHeight: 1.6 }}>
              Record what it actually sold for. If you gave a discount, note why — haggle, bundle deal, loyal customer, end-of-event clearance.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Final Sale Price">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: textSecondary, fontSize: "13px" }}>$</span>
                  <input style={{ ...styles.input, paddingLeft: "22px", fontFamily: fonts, fontSize: "15px", fontWeight: 700, color: isSold ? "#3A7A3A" : textPrimary }} type="number" min="0" step="0.01" value={form.finalSalePrice || ""} onChange={e => upd("finalSalePrice", parseNum(e.target.value))} placeholder="0.00" />
                </div>
              </Field>
              <Field label="Discount Note" hint="Why did you come down, if you did?">
                <input style={styles.input} value={form.saleNote || ""} onChange={e => upd("saleNote", e.target.value)} placeholder="e.g. End of day deal, loyal customer" />
              </Field>
            </div>
            {form.finalSalePrice > 0 && form.price > 0 && (
              <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", textAlign: "center" }}>
                {[
                  [discount > 0 ? `${discount}% off` : "Full price", discount > 0 ? "Discount given" : "No discount"],
                  [formatCurrency(form.finalSalePrice - form.cost), "Profit"],
                  [form.cost > 0 ? `${Math.round((form.finalSalePrice / form.cost - 1) * 100)}%` : "—", "Return on cost"],
                ].map(([val, label]) => (
                  <div key={label} style={{ padding: "8px", background: `${softSage}10`, border: `1px solid ${softSage}25`, borderRadius: "1px" }}>
                    <div style={{ fontFamily: fonts, fontSize: "18px", fontWeight: 700, color: softSage }}>{val}</div>
                    <div style={{ fontSize: "10px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "2px" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
            <button style={styles.btnOutline} onClick={() => setActiveSection("provenance")}>← Provenance</button>
            <button style={styles.btn} onClick={() => setActiveSection("photos")}>Continue to Photos →</button>
          </div>
        </div>
      )}

      {/* ── PHOTOS ── */}
      {activeSection === "photos" && (
        <div style={styles.card}>
          <p style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginBottom: "16px", lineHeight: 1.6, borderLeft: `2px solid ${border}`, paddingLeft: "10px" }}>
            Front, back, label, closure, lining, damage, full-length, detail — each photo is a selling tool. Cover shot appears first.
          </p>
          {(form.photos || []).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "20px" }}>
              {(form.photos || []).map((p, idx) => (
                <div key={p.id} style={{ borderRadius: "2px", overflow: "hidden", border: `1px solid ${border}`, background: "#E8DCC0", position: "relative" }}>
                  <img src={p.url} alt={p.caption || ""} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} onError={e => { e.currentTarget.style.display = "none"; }} />
                  {idx === 0 && (
                    <div style={{ position: "absolute", top: "6px", left: "6px", background: accent, color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Cover</div>
                  )}
                  <div style={{ padding: "7px 8px" }}>
                    {p.caption && <div style={{ fontSize: "11px", color: textSecondary, fontStyle: "italic", marginBottom: "5px", lineHeight: 1.4 }}>{p.caption}</div>}
                    <div style={{ display: "flex", gap: "4px", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {idx > 0 && <button onClick={() => movePhoto(idx, -1)} style={{ background: "none", border: `1px solid ${border}`, cursor: "pointer", fontSize: "10px", padding: "2px 7px", color: textSecondary }}>←</button>}
                        {idx < (form.photos || []).length - 1 && <button onClick={() => movePhoto(idx, 1)} style={{ background: "none", border: `1px solid ${border}`, cursor: "pointer", fontSize: "10px", padding: "2px 7px", color: textSecondary }}>→</button>}
                      </div>
                      <button onClick={() => removePhoto(p.id)} style={{ background: "#FAF0EE", border: "1px solid #C4837A", cursor: "pointer", fontSize: "10px", padding: "2px 7px", color: "#8B1A1A" }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(form.photos || []).length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 20px", border: `1px dashed ${border}`, marginBottom: "16px", color: textSecondary }}>
              <div style={{ fontSize: "28px", marginBottom: "8px", color: border }}>✦</div>
              <p style={{ margin: 0, fontSize: "13px", fontStyle: "italic" }}>No photos yet — that's fine. Add them when you have them.</p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "8px", alignItems: "end" }}>
            <Field label="Photo URL">
              <input style={styles.input} value={photoUrlInput} onChange={e => setPhotoUrlInput(e.target.value)} placeholder="Paste image URL" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhoto())} />
            </Field>
            <Field label="Caption">
              <input style={styles.input} value={photoCaptionInput} onChange={e => setPhotoCaptionInput(e.target.value)} placeholder="e.g. Label detail" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhoto())} />
            </Field>
            <button style={{ ...styles.btnOutline, marginBottom: "0", height: "38px", whiteSpace: "nowrap" }} onClick={addPhoto} type="button">+ Add</button>
          </div>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
            <button style={styles.btnOutline} onClick={() => setActiveSection("pricing")}>← Pricing</button>
            <button style={styles.btn} onClick={() => setActiveSection("notes")}>Continue to Notes →</button>
          </div>
        </div>
      )}

      {/* ── NOTES & TAGS ── */}
      {activeSection === "notes" && (
        <div style={styles.card}>
          <SectionWrap hint="Tags make pieces findable by theme or character. Notes are for yourself — styling ideas, display thoughts, care reminders, anything that doesn't fit elsewhere.">
            <Field label="Tags" hint="Press Enter to add — click to remove" span={2}>
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                <input style={{ ...styles.input, flex: 1 }} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="e.g. cocktail, silk, romantic, workwear" />
                <button style={{ ...styles.btnOutline, whiteSpace: "nowrap" }} onClick={addTag} type="button">Add</button>
              </div>
              <div>{(form.tags || []).map(t => (
                <button key={t} onClick={() => removeTag(t)} style={{ ...styles.tag, cursor: "pointer", border: `1px solid ${tealLight}70`, background: "none" }}>
                  {t} <span style={{ opacity: 0.5, marginLeft: "3px" }}>×</span>
                </button>
              ))}</div>
              {(form.tags || []).length === 0 && <p style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", margin: "4px 0 0" }}>No tags yet.</p>}
            </Field>
            <Field label="Notes" span={2}>
              <textarea style={{ ...styles.textarea, minHeight: "100px" }} value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Styling ideas, display pairings, care instructions, things to mention to customers, reminders to yourself…" />
            </Field>
          </SectionWrap>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button style={styles.btnOutline} onClick={() => setActiveSection("photos")}>← Photos</button>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={styles.btnOutline} onClick={() => navigate(isEdit ? "garment-detail" : "inventory", isEdit ? form.id : null)}>Discard</button>
              <button style={styles.btn} onClick={() => saveGarment(form)}>{isEdit ? "Save Changes" : "Add to Collection"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// === EVENT FORM ===
function EventForm() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useContext(AppCtx);
  const [form, setForm] = useState(() => editingEvent ? normalizeEvent(editingEvent) : emptyEvent());
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = events.some(e => e.id === form.id);
  const totalFees = (form.boothFee || 0) + (form.travelCost || 0) + (form.suppliesCost || 0) + (form.otherFees || 0);

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate("events")}>← Cancel</button>
      <h1 style={styles.h1}>{isEdit ? "Edit" : "Add"} Event</h1>
      <div style={styles.card}>
        <h3 style={styles.h3}>Event Info</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <Field label="Event Name" span={2}><input style={styles.input} value={form.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. Spring Flea at RiNo" /></Field>
          <Field label="Location"><input style={styles.input} value={form.location} onChange={e => upd("location", e.target.value)} placeholder="e.g. RiNo Art District, Denver" /></Field>
          <Field label="Start Date"><input style={styles.input} type="date" value={form.date} onChange={e => upd("date", e.target.value)} /></Field>
          <Field label="End Date" hint="Leave blank for single-day events"><input style={styles.input} type="date" value={form.endDate || ""} onChange={e => upd("endDate", e.target.value)} min={form.date} /></Field>
          <Field label="Status"><select style={styles.select} value={form.status} onChange={e => upd("status", e.target.value)}>{EVENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Notes" span={2}><textarea style={styles.textarea} value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Booth info, what to bring, collaborations…" /></Field>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Event Costs</h3>
        <p style={{ fontSize: "12px", color: textSecondary, marginTop: "-4px", marginBottom: "12px" }}>Track what this event costs you — booth fees, travel, supplies, anything else.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          <Field label="Booth / Table Fee"><input style={styles.input} type="number" value={form.boothFee || ""} onChange={e => upd("boothFee", parseNum(e.target.value))} placeholder="0" /></Field>
          <Field label="Travel"><input style={styles.input} type="number" value={form.travelCost || ""} onChange={e => upd("travelCost", parseNum(e.target.value))} placeholder="0" /></Field>
          <Field label="Supplies"><input style={styles.input} type="number" value={form.suppliesCost || ""} onChange={e => upd("suppliesCost", parseNum(e.target.value))} placeholder="0" /></Field>
          <Field label="Other Fees"><input style={styles.input} type="number" value={form.otherFees || ""} onChange={e => upd("otherFees", parseNum(e.target.value))} placeholder="0" /></Field>
        </div>
        {totalFees > 0 && <div style={{ marginTop: "12px", fontFamily: fonts, fontSize: "16px", color: accent }}>Total: {formatCurrency(totalFees)}</div>}
        <div style={{ marginTop: "12px" }}>
          <Field label="Cost Notes"><textarea style={{ ...styles.textarea, minHeight: "60px" }} value={form.feeNotes || ""} onChange={e => upd("feeNotes", e.target.value)} placeholder="Deposit details, shared costs, what supplies to buy…" /></Field>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button style={styles.btnOutline} onClick={() => navigate("events")}>Cancel</button>
        <button style={styles.btn} onClick={() => saveEvent(form)}>{isEdit ? "Save Changes" : "Create Event"}</button>
      </div>
    </div>
  );
};

// ==========================================
//  TAG BROWSER
// ==========================================
function TagBrowser() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useApp();
  const [activeTag, setActiveTag] = useState(null);

  // Build sorted tag list with counts
  const tagMap = {};
  garments.forEach(g => (g.tags || []).forEach(t => {
    tagMap[t] = (tagMap[t] || 0) + 1;
  }));
  const allTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const taggedGarments = activeTag ? garments.filter(g => (g.tags || []).includes(activeTag)) : [];

  if (allTags.length === 0) return null;

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ ...styles.h3, margin: 0 }}>Browse by Tag</h3>
        {activeTag && (
          <button style={{ ...styles.btnOutline, fontSize: "11px", padding: "4px 10px" }} onClick={() => setActiveTag(null)}>
            Clear ×
          </button>
        )}
      </div>

      {/* Tag cloud */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: activeTag ? "16px" : 0 }}>
        {allTags.map(([tag, count]) => {
          const isActive = activeTag === tag;
          return (
            <button
              key={tag}
              onClick={() => setActiveTag(isActive ? null : tag)}
              style={{
                padding: "3px 10px", borderRadius: "1px", border: `1px solid ${isActive ? accent : border}`,
                background: isActive ? accent : `${accent}0d`,
                color: isActive ? "#fff" : accent,
                fontSize: "12px", fontWeight: isActive ? 600 : 400,
                cursor: "pointer", fontFamily: bodyFont, transition: "all 0.15s",
                display: "inline-flex", alignItems: "center", gap: "5px",
              }}
            >
              {tag}
              <span style={{
                fontSize: "10px", opacity: 0.7,
                background: isActive ? "rgba(255,255,255,0.25)" : `${accent}22`,
                borderRadius: "1px", padding: "0 5px", lineHeight: "16px",
                color: isActive ? "#fff" : accent,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results list */}
      {activeTag && (
        <div style={{ borderTop: `1px solid ${border}`, paddingTop: "14px" }}>
          <div style={{ fontSize: "12px", color: textSecondary, marginBottom: "10px", fontStyle: "italic" }}>
            {taggedGarments.length} piece{taggedGarments.length !== 1 ? "s" : ""} tagged <strong style={{ color: accent }}>#{activeTag}</strong>
          </div>
          {taggedGarments.map(g => (
            <div key={g.id} onClick={() => navigate("garment-detail", g.id)}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {(g.photos || []).length > 0
                ? <img src={g.photos[0].url} alt="" style={{ width: "38px", height: "38px", objectFit: "cover", borderRadius: "2px", flexShrink: 0 }} />
                : <div style={{ width: "38px", height: "38px", borderRadius: "2px", background: "#E8DCC0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: accentLight, flexShrink: 0 }}>✦</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: fonts }}>{g.name}</div>
                <div style={{ fontSize: "11px", color: textSecondary }}>{g.era} · {g.category} · {formatCurrency(g.price)}</div>
              </div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "200px" }}>
                {(g.tags || []).filter(t => t !== activeTag).map(t => (
                  <span key={t} style={styles.tag}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
//  DASHBOARD
// ==========================================
function DashboardView() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, lastBackupAt, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useApp();
  const todoCount = needsRepair.length + needsStory.length + needsPhotos.length;
  const eventsWithMeta = upcomingEvents.map(e => ({
    ...e,
    garmentCount: (e.garmentIds || []).length,
    totalFees: (e.boothFee || 0) + (e.travelCost || 0) + (e.suppliesCost || 0) + (e.otherFees || 0),
    days: daysUntil(e.date),
  }));
  // Surface an event that's happening now (or imminently). Highest-priority
  // first: an Active event > a Confirmed event today or tomorrow.
  const activeEvent = events.find(e => e.status === "Active")
    || events.find(e => e.status === "Confirmed" && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 1);

  // Nudge for a fresh backup if (a) she's never backed up and has a real
  // collection going, or (b) it's been more than 30 days since last backup.
  const daysSinceBackup = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000)
    : null;
  const needsBackup = garments.length >= 5 && (daysSinceBackup === null || daysSinceBackup > 30);

  return (
    <div>
      <div style={{ marginBottom: "28px", borderBottom: `2px solid ${textPrimary}`, paddingBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "6px" }}>
        <div style={{ flex: 1, height: "1px", background: border }} />
        <span style={{ padding: "0 14px", fontSize: "10px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: bodyFont }}>Inventory Ledger</span>
        <div style={{ flex: 1, height: "1px", background: border }} />
      </div>
      <h1 style={{ ...styles.h1, fontSize: "36px", textAlign: "center", letterSpacing: "0.02em" }}>Megan's Marvels</h1>
      <p style={{ color: textSecondary, fontSize: "12px", marginTop: "4px", fontStyle: "italic", fontFamily: fonts, textAlign: "center", letterSpacing: "0.04em" }}>
        {garments.length} piece{garments.length !== 1 ? "s" : ""} in collection · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
    </div>

      {/* Active or imminent event — surface a quick path to booth mode */}
      {activeEvent && (
        <div style={{ ...styles.card, borderTop: `3px solid ${softSage}`, background: `${softSage}10`, marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "10px", color: softSage, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "3px" }}>
                {activeEvent.status === "Active" ? "● Live now" : daysUntil(activeEvent.date) === 0 ? "Today" : "Tomorrow"}
              </div>
              <div style={{ fontFamily: fonts, fontSize: "20px", fontWeight: 700 }}>{activeEvent.name}</div>
              <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>
                {activeEvent.location} · {(activeEvent.garmentIds || []).length} garment{(activeEvent.garmentIds || []).length !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button style={styles.btnOutline} onClick={() => navigate("event-detail", activeEvent.id)}>View event</button>
              <button style={{ ...styles.btn, background: softSage, borderColor: softSage }} onClick={() => navigate("quick-sale", activeEvent.id)}>
                Open booth →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup nudge — gentle reminder when collection has grown but no recent backup */}
      {needsBackup && (
        <div style={{ ...styles.card, borderLeft: `3px solid ${accent}`, borderTop: `1px solid ${border}`, background: `${accent}06`, marginBottom: "20px", padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: "240px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: accent, marginBottom: "2px" }}>
                {daysSinceBackup === null ? "Time for your first backup" : `Last backup was ${daysSinceBackup} days ago`}
              </div>
              <div style={{ fontSize: "12px", color: textSecondary, lineHeight: 1.5 }}>
                Save a snapshot of your collection so you don't lose it. Takes one click.
              </div>
            </div>
            <button style={{ ...styles.btnOutline, fontSize: "11px", padding: "6px 12px", whiteSpace: "nowrap" }} onClick={() => navigate("export")}>
              Back up now →
            </button>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "28px" }}>
        {[
          { n: garments.length, l: "Pieces" },
          { n: ERAS.filter(era => garments.some(g => g.era === era)).length, l: "Eras Represented" },
          { n: formatCurrency(totalCost), l: "Collection Cost" },
          { n: formatCurrency(totalValue), l: "Asking Value" },
        ].map((s, i) => (
          <div key={i} style={styles.stat}>
            <div style={{ ...styles.statNum, fontSize: "28px" }}>{s.n}</div>
            <div style={styles.statLabel}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Needs Attention */}
      {todoCount > 0 && (
        <>
          <SectionHeader icon="✦" title="Needs Your Attention" subtitle={`${todoCount} thing${todoCount !== 1 ? "s" : ""} to look at`} />
          <div style={styles.card}>
            {needsRepair.length > 0 && (
              <div style={{ marginBottom: (needsStory.length > 0 || needsPhotos.length > 0) ? "16px" : 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: warmRose, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Repair Queue — {needsRepair.length} piece{needsRepair.length !== 1 ? "s" : ""}</div>
                {needsRepair.map(g => (
                  <div key={g.id} onClick={() => navigate("garment-detail", g.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {(g.photos || []).length > 0 ? <img src={g.photos[0].url} alt="" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "2px" }} /> : <div style={{ width: "32px", height: "32px", borderRadius: "2px", background: "#E8DCC0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: accentLight }}>✦</div>}
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{g.name}</span>
                    </div>
                    <Badge color={statusColor(g.repairStatus)}>{g.repairStatus}</Badge>
                  </div>
                ))}
              </div>
            )}
            {needsStory.length > 0 && (
              <div style={{ marginBottom: needsPhotos.length > 0 ? "16px" : 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", marginTop: needsRepair.length > 0 ? "8px" : 0 }}>Missing Their Story — {needsStory.length} piece{needsStory.length !== 1 ? "s" : ""}</div>
                {needsStory.slice(0, 5).map(g => (
                  <div key={g.id} onClick={() => { setEditingGarment({ ...g, photos: [...(g.photos || [])] }); navigate("add-garment"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
                    <span style={{ fontSize: "13px" }}>{g.name}</span>
                    <span style={{ fontSize: "11px", color: accentLight, fontStyle: "italic" }}>add story →</span>
                  </div>
                ))}
                {needsStory.length > 5 && <div style={{ fontSize: "12px", color: textSecondary, marginTop: "6px" }}>+ {needsStory.length - 5} more</div>}
              </div>
            )}
            {needsPhotos.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: softSage, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", marginTop: (needsRepair.length > 0 || needsStory.length > 0) ? "8px" : 0 }}>Need Photos — {needsPhotos.length} piece{needsPhotos.length !== 1 ? "s" : ""}</div>
                {needsPhotos.slice(0, 5).map(g => (
                  <div key={g.id} onClick={() => { setEditingGarment({ ...g, photos: [...(g.photos || [])] }); navigate("add-garment"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
                    <span style={{ fontSize: "13px" }}>{g.name}</span>
                    <span style={{ fontSize: "11px", color: accentLight, fontStyle: "italic" }}>add photos →</span>
                  </div>
                ))}
                {needsPhotos.length > 5 && <div style={{ fontSize: "12px", color: textSecondary, marginTop: "6px" }}>+ {needsPhotos.length - 5} more</div>}
              </div>
            )}
          </div>
        </>
      )}
      {todoCount === 0 && (
        <div style={{ ...styles.card, textAlign: "center", padding: "28px", background: bg }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>✦</div>
          <div style={{ fontFamily: fonts, fontSize: "16px", fontStyle: "italic", color: accent }}>Everything is in order. Your collection is well cared for.</div>
        </div>
      )}

      {/* Upcoming Events */}
      <SectionHeader icon="✦" title="Coming Up" subtitle={upcomingEvents.length === 0 ? "No upcoming events" : null} action={() => { setEditingEvent(emptyEvent()); navigate("add-event"); }} actionLabel="+ New Event" />
      {eventsWithMeta.length > 0 ? (
        <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
          {eventsWithMeta.map(e => (
            <div key={e.id} onClick={() => navigate("event-detail", e.id)} style={{ ...styles.card, cursor: "pointer", marginBottom: 0, padding: "16px 20px", transition: "border-color 0.2s" }} onMouseEnter={ev => ev.currentTarget.style.borderColor = accentLight} onMouseLeave={ev => ev.currentTarget.style.borderColor = border}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: fonts, fontSize: "17px", marginBottom: "2px" }}>{e.name}</div>
                  <div style={{ fontSize: "12px", color: textSecondary }}>{formatDateRange(e.date, e.endDate)} · {e.location}</div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "12px", color: textSecondary }}>
                    <span>{e.garmentCount} garment{e.garmentCount !== 1 ? "s" : ""} assigned</span>
                    {e.totalFees > 0 && <span>· {formatCurrency(e.totalFees)} in costs</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Badge color={statusColor(e.status)}>{e.status}</Badge>
                  {e.days >= 0 && e.days < 999 && (
                    <div style={{ fontSize: "11px", color: e.days <= 7 ? warmRose : textSecondary, marginTop: "6px", fontWeight: e.days <= 7 ? 600 : 400 }}>
                      {e.days === 0 ? "Today!" : e.days === 1 ? "Tomorrow" : `${e.days} days away`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...styles.card, padding: "16px", textAlign: "center" }}>
          <p style={{ color: textSecondary, fontSize: "13px", margin: 0 }}>No upcoming events. When you're ready, you can plan your next pop-up here.</p>
        </div>
      )}

      {/* Collection Overview */}
      <SectionHeader icon="✦" title="The Collection" action={() => navigate("inventory")} actionLabel="View All →" />
      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.h3}>By Era</h3>
          {ERAS.filter(era => garments.some(g => g.era === era)).map(era => {
            const count = garments.filter(g => g.era === era).length;
            const pct = garments.length > 0 ? (count / garments.length) * 100 : 0;
            return (
              <div key={era} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div style={{ width: "48px", fontSize: "12px", color: textSecondary, fontWeight: 500 }}>{era}</div>
                <div style={{ flex: 1, height: "8px", borderRadius: "1px", background: border, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: "1px", background: `linear-gradient(90deg, ${accentLight}, ${accent})`, transition: "width 0.5s" }} />
                </div>
                <div style={{ width: "20px", fontSize: "12px", color: textSecondary, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>
        <div style={styles.card}>
          <h3 style={styles.h3}>Recently Added</h3>
          {[...garments].sort((a, b) => (b.dateAcquired || "").localeCompare(a.dateAcquired || "")).slice(0, 4).map(g => (
            <div key={g.id} onClick={() => navigate("garment-detail", g.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
              {(g.photos || []).length > 0 ? <img src={g.photos[0].url} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "2px" }} /> : <div style={{ width: "36px", height: "36px", borderRadius: "2px", background: "#E8DCC0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: accentLight }}>✦</div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: fonts }}>{g.name}</div>
                <div style={{ fontSize: "11px", color: textSecondary }}>{g.era} · {formatDate(g.dateAcquired)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tag Browser */}
      <TagBrowser />

      {/* Money — honest, practical */}
      <SectionHeader icon="✦" title="Sustainability" subtitle="The financial foundation that keeps this work going" />
      <div style={styles.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", textAlign: "center" }}>
          {[
            ["Collection Cost", formatCurrency(totalCost), "what you've put in"],
            ["Event Costs", formatCurrency(totalEventCosts), "booths, travel, supplies"],
            ["Total Invested", formatCurrency(totalCost + totalEventCosts), "collection + events"],
            ["Asking Value", formatCurrency(totalValue), "if priced pieces sell"],
          ].map(([label, val, sub]) => (
            <div key={label}>
              <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontFamily: fonts, fontSize: "24px", color: label === "Total Invested" ? accent : label === "Asking Value" ? softSage : textPrimary }}>{val}</div>
              <div style={{ fontSize: "11px", color: textSecondary }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// === INVENTORY LIST ===
function InventoryView() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useApp();
  return (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
      <div>
        <h1 style={styles.h1}>Inventory</h1>
        <p style={styles.subtitle}>{filtered.length} piece{filtered.length !== 1 ? "s" : ""} in collection</p>
      </div>
      <button style={styles.btn} onClick={() => { setEditingGarment(emptyGarment()); navigate("add-garment"); }}>+ Add Garment</button>
    </div>
    <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
      <input style={{ ...styles.input, maxWidth: "260px" }} placeholder="Search name, SKU, brand, color, tags…" value={search} onChange={e => setSearch(e.target.value)} />
      <select style={{ ...styles.select, maxWidth: "140px" }} value={filterEra} onChange={e => setFilterEra(e.target.value)}><option value="">All Eras</option>{ERAS.map(e => <option key={e} value={e}>{e}</option>)}</select>
      <select style={{ ...styles.select, maxWidth: "160px" }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="">All Categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <select style={{ ...styles.select, maxWidth: "160px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">All Statuses</option>{GARMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
    </div>
    {filtered.map(g => (
      <div key={g.id} onClick={() => navigate("garment-detail", g.id)} style={styles.cardHover} onMouseEnter={e => { e.currentTarget.style.borderColor = accentLight; e.currentTarget.style.borderLeftColor = accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.borderLeftColor = border; }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flexShrink: 0, width: "56px", height: "56px", borderRadius: "2px", overflow: "hidden", border: `1px solid ${border}`, background: "#EDE0CC", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(g.photos || []).length > 0
              ? <img src={g.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.currentTarget.style.display = "none"; }} />
              : <span style={{ fontSize: "18px", color: border }}>✦</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: "10px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1px" }}>{g.sku}</div>
            <div style={{ fontSize: "15px", fontFamily: fonts, fontWeight: 700, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
            <div style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {[g.era, g.category, g.size, g.brand, g.countryOfOrigin].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Badge color={statusColor(g.condition)}>{g.condition}</Badge>
            <Badge color={statusColor(g.status)}>{g.status}</Badge>
            {g.repairStatus !== "None Needed" && g.repairStatus !== "Completed" && <Badge color={statusColor(g.repairStatus)}>{g.repairStatus}</Badge>}
            <span style={{ fontFamily: fonts, fontSize: "18px", color: accent, marginLeft: "6px", fontWeight: 700, whiteSpace: "nowrap" }}>{formatCurrency(g.price)}</span>
          </div>
        </div>
      </div>
    ))}
    {filtered.length === 0 && <p style={{ textAlign: "center", color: textSecondary, padding: "40px" }}>No garments match your filters.</p>}
  </div>
);
}

// === GARMENT DETAIL ===
function GarmentDetail() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useApp();
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const g = garments.find(x => x.id === selectedId);
  if (!g) return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate("inventory")}>← Back to Inventory</button>
      <p style={{ color: textSecondary, padding: "40px", textAlign: "center" }}>Garment not found. It may have been deleted.</p>
    </div>
  );
  const photos = g.photos || [];
  const assignedEvents = events.filter(e => (e.garmentIds || []).includes(g.id));
  return (
    <div>
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div onClick={() => setLightboxIdx(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: "24px" }}>
          <img src={photos[lightboxIdx].url} alt="" style={{ maxWidth: "90vw", maxHeight: "75vh", objectFit: "contain", borderRadius: "2px", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
          {photos[lightboxIdx].caption && <div style={{ color: "#fff", fontSize: "14px", marginTop: "12px", fontFamily: fonts, fontStyle: "italic", textAlign: "center", maxWidth: "500px" }}>{photos[lightboxIdx].caption}</div>}
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "8px" }}>{lightboxIdx + 1} of {photos.length} — click anywhere to close</div>
          {photos.length > 1 && (
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + photos.length) % photos.length); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", fontSize: "18px" }}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % photos.length); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", fontSize: "18px" }}>›</button>
            </div>
          )}
        </div>
      )}

      <button style={styles.backBtn} onClick={() => navigate("inventory")}>← Back to Inventory</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>{g.sku}</div>
          <h1 style={{ ...styles.h1, marginBottom: "8px" }}>{g.name}</h1>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Badge color={statusColor(g.condition)}>{g.condition}</Badge>
            <Badge color={statusColor(g.status)}>{g.status}</Badge>
            {g.repairStatus !== "None Needed" && <Badge color={statusColor(g.repairStatus)}>{g.repairStatus}</Badge>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {g.status === "Sold" && (
            <button
              style={{ ...styles.btnOutline, color: warmRose, borderColor: warmRose }}
              onClick={() => {
                if (!window.confirm("Undo this sale? The piece will return to your collection and the sale price/note will be cleared.")) return;
                setGarments(prev => prev.map(x => x.id === g.id ? {
                  ...x,
                  status: "In Collection",
                  finalSalePrice: 0,
                  saleNote: "",
                } : x));
              }}
            >
              ↶ Undo Sale
            </button>
          )}
          <button style={styles.btnOutline} onClick={() => { setEditingGarment({ ...g, photos: [...(g.photos || [])] }); navigate("add-garment"); }}>Edit</button>
          <button style={styles.btnDanger} onClick={() => { if (window.confirm("Delete this garment?")) deleteGarment(g.id); }}>Delete</button>
        </div>
      </div>

      {photos.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.h3}>Photos ({photos.length})</h3>
          <div style={{ display: "grid", gridTemplateColumns: photos.length === 1 ? "1fr" : photos.length === 2 ? "1fr 1fr" : "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
            {photos.map((p, idx) => (
              <div key={p.id} onClick={() => setLightboxIdx(idx)} style={{ cursor: "zoom-in", position: "relative", borderRadius: "2px", overflow: "hidden", border: `1px solid ${border}`, aspectRatio: photos.length === 1 ? "16/9" : "4/5", background: "#E8DCC0" }}>
                <img src={p.url} alt={p.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                {p.caption && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 10px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#fff", fontSize: "11px", fontStyle: "italic" }}>{p.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(g.story || g.sourceDetail) && (
        <div style={styles.card}>
          <h3 style={styles.h3}>The Story</h3>
          {g.sourceDetail && <div style={{ fontSize: "13px", color: textSecondary, marginBottom: "10px", fontStyle: "italic", borderLeft: `3px solid ${accentLight}`, paddingLeft: "12px" }}>Source: {g.source} — {g.sourceDetail}</div>}
          {g.story && <p style={{ fontSize: "14px", lineHeight: 1.8, color: textPrimary, margin: 0 }}>{g.story}</p>}
        </div>
      )}

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.h3}>Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
            {[["Era", g.era], ["Category", g.category], ["Size", g.size], ["Brand", g.brand || "—"], ["Colors", g.colors || "—"], ["Materials", g.materials || "—"], ["Country of Origin", g.countryOfOrigin || "Unknown"], ["Measurements", g.measurements || "—"], ["Acquired", formatDate(g.dateAcquired)]].map(([k, v]) => (
              <div key={k}><span style={{ color: textSecondary, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</span><br /><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
          </div>
          {g.flaws && (
            <div style={{ marginTop: "14px", padding: "10px 12px", background: `${accent}08`, border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: "1px" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: accent, fontWeight: 700, marginBottom: "4px" }}>Flaws & Condition Notes</div>
              <p style={{ margin: 0, fontSize: "13px", color: textPrimary, lineHeight: 1.6 }}>{g.flaws}</p>
            </div>
          )}
        </div>
        <div style={styles.card}>
          <h3 style={styles.h3}>Pricing & QR</h3>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${g.status === "Sold" ? 4 : 3}, 1fr)`, gap: "12px", textAlign: "center", marginBottom: "16px" }}>
            <div><div style={{ ...styles.statNum, fontSize: "18px", color: textSecondary }}>{formatCurrency(g.sourceAskingPrice || 0)}</div><div style={styles.statLabel}>Source Listed</div></div>
            <div><div style={{ ...styles.statNum, fontSize: "18px", color: textPrimary }}>{formatCurrency(g.cost)}</div><div style={styles.statLabel}>You Paid</div></div>
            <div><div style={{ ...styles.statNum, fontSize: "20px" }}>{formatCurrency(g.price)}</div><div style={styles.statLabel}>Asking Price</div></div>
            {g.status === "Sold" && (
              <div style={{ background: `${softSage}12`, border: `1px solid ${softSage}30`, borderRadius: "1px", padding: "6px 4px" }}>
                <div style={{ ...styles.statNum, fontSize: "20px", color: softSage }}>{formatCurrency(g.finalSalePrice || 0)}</div>
                <div style={styles.statLabel}>Sold For</div>
                {g.finalSalePrice > 0 && g.finalSalePrice < g.price && (
                  <div style={{ fontSize: "10px", color: softSage, marginTop: "3px", fontStyle: "italic" }}>
                    {Math.round((1 - g.finalSalePrice / g.price) * 100)}% off asking
                  </div>
                )}
                {g.finalSalePrice === 0 && (
                  <div style={{ fontSize: "10px", color: softSage, marginTop: "3px", fontStyle: "italic" }}>
                    gift / trade
                  </div>
                )}
              </div>
            )}
          </div>
          {g.saleNote && (
            <div style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginBottom: "10px", padding: "6px 10px", background: `${softSage}08`, borderLeft: `2px solid ${softSage}` }}>
              Discount note: {g.saleNote}
            </div>
          )}
          {g.sourceAskingPrice > 0 && g.cost < g.sourceAskingPrice && (
            <div style={{ fontSize: "11px", color: teal, fontStyle: "italic", textAlign: "center", marginBottom: "12px", background: `${teal}10`, border: `1px solid ${teal}30`, borderRadius: "2px", padding: "6px 10px" }}>
              Negotiated {Math.round((1 - g.cost / g.sourceAskingPrice) * 100)}% below asking — use that context when setting your price
            </div>
          )}
          <hr style={styles.divider} />
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <QRCode text={g.sku} size={90} />
            <div style={{ fontSize: "12px", color: textSecondary }}>
              <div style={{ fontWeight: 700, color: textPrimary, marginBottom: "2px", fontFamily: fonts }}>{g.sku}</div>
              Print for hang tags or labels.
            </div>
          </div>
        </div>
      </div>

      {g.tags && g.tags.length > 0 && <div style={styles.card}><h3 style={styles.h3}>Tags</h3><div>{g.tags.map(t => <span key={t} style={styles.tag}>{t}</span>)}</div></div>}
      {g.notes && <div style={styles.card}><h3 style={styles.h3}>Notes</h3><p style={{ fontSize: "13px", color: textSecondary, margin: 0, lineHeight: 1.7 }}>{g.notes}</p></div>}

      <div style={styles.card}>
        <h3 style={styles.h3}>Assigned Events</h3>
        {assignedEvents.length === 0 ? <p style={{ fontSize: "13px", color: textSecondary }}>Not assigned to any events yet.</p> : assignedEvents.map(e => (
          <div key={e.id} onClick={() => navigate("event-detail", e.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
            <div><span style={{ fontWeight: 500, fontSize: "13px" }}>{e.name}</span><br /><span style={{ fontSize: "12px", color: textSecondary }}>{formatDate(e.date)} · {e.location}</span></div>
            <Badge color={statusColor(e.status)}>{e.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}


// === EVENTS LIST ===
function EventsView() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useApp();
  return (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
      <div><h1 style={styles.h1}>Events</h1><p style={styles.subtitle}>Pop-ups, markets, and shows</p></div>
      <button style={styles.btn} onClick={() => { setEditingEvent(emptyEvent()); navigate("add-event"); }}>+ Add Event</button>
    </div>
    {events.length === 0 ? <p style={{ textAlign: "center", color: textSecondary, padding: "40px" }}>No events yet. Add your first pop-up!</p> :
      [...events].sort((a, b) => (a.date || "").localeCompare(b.date || "")).map(e => {
        const tf = (e.boothFee || 0) + (e.travelCost || 0) + (e.suppliesCost || 0) + (e.otherFees || 0);
        return (
          <div key={e.id} onClick={() => navigate("event-detail", e.id)} style={styles.cardHover} onMouseEnter={ev => ev.currentTarget.style.borderColor = accentLight} onMouseLeave={ev => ev.currentTarget.style.borderColor = border}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "16px", fontFamily: fonts }}>{e.name}</div>
                <div style={{ fontSize: "12px", color: textSecondary }}>{formatDateRange(e.date, e.endDate)} · {e.location}</div>
                <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>{(e.garmentIds || []).length} garment{(e.garmentIds || []).length !== 1 ? "s" : ""}{tf > 0 && ` · ${formatCurrency(tf)} in costs`}</div>
              </div>
              <Badge color={statusColor(e.status)}>{e.status}</Badge>
            </div>
          </div>
        );
      })}
  </div>
);
}

// === EVENT DETAIL ===
function EventDetail() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useApp();
  const e = events.find(x => x.id === selectedId);
  if (!e) return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate("events")}>← Back to Events</button>
      <p style={{ color: textSecondary, padding: "40px", textAlign: "center" }}>Event not found. It may have been deleted.</p>
    </div>
  );
  const garmentIds = e.garmentIds || [];
  const assigned = garments.filter(g => garmentIds.includes(g.id));
  const unassigned = garments.filter(g => !garmentIds.includes(g.id));
  // Functional updaters that read fresh from prev so quick consecutive
  // adds/removes don't clobber each other's pending changes.
  const addG = (gid) => setEvents(prev => prev.map(x =>
    x.id === e.id ? { ...x, garmentIds: [...(x.garmentIds || []), gid] } : x
  ));
  const removeG = (gid) => setEvents(prev => prev.map(x =>
    x.id === e.id ? { ...x, garmentIds: (x.garmentIds || []).filter(id => id !== gid) } : x
  ));
  const totalFees = (e.boothFee || 0) + (e.travelCost || 0) + (e.suppliesCost || 0) + (e.otherFees || 0);
  const assignedValue = assigned.reduce((s, g) => s + (g.price || 0), 0);
  const soldHere = assigned.filter(g => g.status === "Sold");
  // Use finalSalePrice strictly — a gift/trade at $0 contributes $0 to gross,
  // not its asking price.
  const grossSales = soldHere.reduce((s, g) => s + (g.finalSalePrice || 0), 0);

  // Phase status: upcoming (planning/confirmed) vs running (active) vs done (completed/cancelled).
  // Drives which prep / reconciliation panels show.
  const phase = ["Planning", "Confirmed"].includes(e.status) ? "upcoming"
              : e.status === "Active" ? "active"
              : "done";

  const downloadEventSquareCSV = () => {
    if (assigned.length === 0) { window.alert("No garments are assigned to this event yet."); return; }
    const safeName = (e.name || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCSV(buildSquareCSV(assigned), `square-import-${safeName}.csv`);
  };

  // Open a print-friendly window with a packing checklist for this event.
  const printPackingList = () => {
    const rows = assigned.map(g => `
      <tr>
        <td style="border:1px solid #999;padding:6px;width:24px;text-align:center;">☐</td>
        <td style="border:1px solid #999;padding:6px;font-family:Georgia,serif;">${g.name}</td>
        <td style="border:1px solid #999;padding:6px;font-size:11px;color:#555;">${g.sku || ""}</td>
        <td style="border:1px solid #999;padding:6px;font-size:11px;">${g.era || ""}</td>
        <td style="border:1px solid #999;padding:6px;font-size:11px;">${g.size || ""}</td>
        <td style="border:1px solid #999;padding:6px;text-align:right;font-family:Georgia,serif;">$${(g.price || 0).toFixed(0)}</td>
      </tr>`).join("");
    const html = `<!doctype html>
<html><head><title>Packing List — ${e.name}</title>
<style>
  body { font-family: Georgia, serif; padding: 36px; color: #2B1A0E; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .meta { color: #7A5C3A; font-style: italic; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #F5F1E6; border: 1px solid #999; padding: 6px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary { font-size: 13px; padding: 12px; background: #F5F1E6; border: 1px solid #C59A3B; }
  .notes { margin-top: 24px; padding: 12px; border: 1px solid #ccc; font-size: 12px; }
  @media print { .no-print { display: none; } body { padding: 24px; } }
</style></head><body>
  <h1>${e.name}</h1>
  <div class="meta">${formatDateRange(e.date, e.endDate)} · ${e.location || ""}</div>

  <table>
    <thead><tr><th></th><th>Garment</th><th>SKU</th><th>Era</th><th>Size</th><th style="text-align:right;">Price</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="6" style="padding:12px;color:#999;text-align:center;font-style:italic;">No garments assigned</td></tr>`}</tbody>
  </table>

  <div class="summary">
    <strong>${assigned.length}</strong> piece${assigned.length !== 1 ? "s" : ""} · Total asking value <strong>$${assignedValue.toFixed(0)}</strong>
    ${totalFees > 0 ? ` · Event costs <strong>$${totalFees.toFixed(0)}</strong>` : ""}
  </div>

  ${e.notes ? `<div class="notes"><strong>Notes:</strong><br/>${e.notes.replace(/\n/g, "<br/>")}</div>` : ""}
  ${e.feeNotes ? `<div class="notes"><strong>Cost notes:</strong><br/>${e.feeNotes.replace(/\n/g, "<br/>")}</div>` : ""}

  <div class="no-print" style="margin-top:24px;">
    <button onclick="window.print()" style="padding:8px 18px;font-family:inherit;font-size:13px;">Print this</button>
  </div>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { window.alert("Pop-up blocked. Allow pop-ups for this site to print packing lists."); return; }
    w.document.write(html);
    w.document.close();
  };

  const markAllUnsoldReturned = () => {
    const unsold = assigned.filter(g => g.status !== "Sold");
    if (unsold.length === 0) { window.alert("All assigned garments are already marked sold."); return; }
    if (!window.confirm(`Mark ${unsold.length} unsold piece${unsold.length !== 1 ? "s" : ""} as returned to your collection?`)) return;
    setGarments(prev => prev.map(g => unsold.some(u => u.id === g.id) ? { ...g, status: "In Collection" } : g));
  };

  // One-tap event status transitions. Updates without re-opening the edit form.
  const setEventStatus = (newStatus) => {
    setEvents(prev => prev.map(x => x.id === e.id ? { ...x, status: newStatus } : x));
  };

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate("events")}>← Back to Events</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <h1 style={styles.h1}>{e.name}</h1>
          <p style={{ color: textSecondary, fontSize: "14px" }}>{formatDateRange(e.date, e.endDate)} · {e.location}</p>
          <Badge color={statusColor(e.status)}>{e.status}</Badge>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={styles.btnOutline} onClick={() => { setEditingEvent({ ...e }); navigate("add-event"); }}>Edit</button>
          <button style={styles.btnDanger} onClick={() => { if (window.confirm("Delete this event?")) deleteEvent(e.id); }}>Delete</button>
        </div>
      </div>

      {/* Pre-event prep — for upcoming events */}
      {phase === "upcoming" && assigned.length > 0 && (
        <div style={{ ...styles.card, borderTop: `3px solid ${teal}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
            <div>
              <h3 style={{ ...styles.h3, margin: 0, color: teal }}>Pre-Event Prep</h3>
              <p style={{ fontSize: "12px", color: textSecondary, margin: "3px 0 0", fontStyle: "italic" }}>{assigned.length} piece{assigned.length !== 1 ? "s" : ""} ready · {formatCurrency(assignedValue)} in asking value</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginTop: "12px" }}>
            <button onClick={downloadEventSquareCSV} style={{ ...styles.btnOutline, padding: "12px 14px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", textTransform: "none", letterSpacing: 0, borderColor: teal, color: teal, height: "auto" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>↓ Square Import</span>
              <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 400 }}>Just these {assigned.length} garment{assigned.length !== 1 ? "s" : ""}</span>
            </button>
            <button onClick={() => navigate("qr-labels", e.id)} style={{ ...styles.btnOutline, padding: "12px 14px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", textTransform: "none", letterSpacing: 0, height: "auto" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>⌗ QR Hang Tags</span>
              <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 400 }}>Print labels for assigned pieces</span>
            </button>
            <button onClick={printPackingList} style={{ ...styles.btnOutline, padding: "12px 14px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", textTransform: "none", letterSpacing: 0, height: "auto" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>☐ Packing List</span>
              <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 400 }}>Printable checklist with prices</span>
            </button>
          </div>
          <p style={{ fontSize: "11px", color: textSecondary, fontStyle: "italic", marginTop: "14px", marginBottom: "12px", lineHeight: 1.6 }}>
            Workflow: download the Square file before the event and import it into your Square Dashboard. After the event, come back here to mark sold pieces and reconcile what came home.
          </p>
          {e.status === "Confirmed" && daysUntil(e.date) <= 1 && (
            <button onClick={() => setEventStatus("Active")} style={{ ...styles.btn, background: softSage, borderColor: softSage, fontSize: "12px", padding: "10px 18px" }}>
              ● I'm at the event — open booth mode
            </button>
          )}
        </div>
      )}

      {/* Reconciliation — for active or completed events */}
      {(phase === "active" || phase === "done") && assigned.length > 0 && (
        <div style={{ ...styles.card, borderTop: `3px solid ${softSage}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            <div>
              <h3 style={{ ...styles.h3, margin: 0, color: softSage }}>{phase === "active" ? "Live at Event" : "Settle Up"}</h3>
              <p style={{ fontSize: "12px", color: textSecondary, margin: "3px 0 0", fontStyle: "italic" }}>
                {soldHere.length} of {assigned.length} sold · {formatCurrency(grossSales)} gross
                {totalFees > 0 && ` · net of fees: ${formatCurrency(grossSales - totalFees)}`}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button style={{ ...styles.btnOutline, fontSize: "11px", padding: "6px 12px" }} onClick={() => navigate("quick-sale", e.id)}>
                + Quick Sale
              </button>
              {phase === "done" && assigned.some(g => g.status !== "Sold") && (
                <button style={{ ...styles.btnOutline, fontSize: "11px", padding: "6px 12px" }} onClick={markAllUnsoldReturned}>
                  Mark unsold as returned
                </button>
              )}
              {phase === "active" && (
                <button style={{ ...styles.btnOutline, fontSize: "11px", padding: "6px 12px" }} onClick={() => setEventStatus("Completed")}>
                  Wrap up event
                </button>
              )}
            </div>
          </div>
          {assigned.map(g => {
            const isSold = g.status === "Sold";
            return (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${border}`, opacity: isSold ? 0.7 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "16px", color: isSold ? softSage : textSecondary, width: "20px", textAlign: "center" }}>{isSold ? "✓" : "·"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, textDecoration: isSold ? "line-through" : "none" }}>{g.name}</div>
                    <div style={{ fontSize: "11px", color: textSecondary }}>
                      {g.sku} · asking {formatCurrency(g.price)}
                      {isSold && (g.finalSalePrice || 0) > 0 && <span style={{ color: softSage, fontWeight: 600 }}> · sold {formatCurrency(g.finalSalePrice)}</span>}
                      {isSold && (g.finalSalePrice || 0) === 0 && <span style={{ color: softSage, fontWeight: 600, fontStyle: "italic" }}> · sold (gift/trade)</span>}
                    </div>
                  </div>
                </div>
                {!isSold && (
                  <button style={{ ...styles.btn, padding: "5px 12px", fontSize: "11px", background: softSage, borderColor: softSage }} onClick={() => navigate("quick-sale", g.id)}>
                    Mark Sold
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalFees > 0 && (
        <div style={styles.card}>
          <h3 style={styles.h3}>Event Costs</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", textAlign: "center", marginBottom: e.feeNotes ? "12px" : 0 }}>
            {[["Booth Fee", e.boothFee], ["Travel", e.travelCost], ["Supplies", e.suppliesCost], ["Other", e.otherFees], ["Total", totalFees]].map(([label, val], i) => (
              <div key={label}>
                <div style={{ fontFamily: fonts, fontSize: i === 4 ? "22px" : "18px", color: i === 4 ? accent : textPrimary }}>{formatCurrency(val)}</div>
                <div style={{ fontSize: "10px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              </div>
            ))}
          </div>
          {e.feeNotes && <div style={{ fontSize: "13px", color: textSecondary, fontStyle: "italic", borderTop: `1px solid ${border}`, paddingTop: "10px" }}>{e.feeNotes}</div>}
        </div>
      )}

      {e.notes && <div style={styles.card}><h3 style={styles.h3}>Notes</h3><p style={{ fontSize: "13px", color: textSecondary, margin: 0, lineHeight: 1.7 }}>{e.notes}</p></div>}

      <div style={styles.card}>
        <h3 style={styles.h3}>Assigned Garments ({assigned.length})</h3>
        {assigned.length > 0 && <div style={{ fontSize: "12px", color: textSecondary, marginBottom: "8px" }}>Total asking value: {formatCurrency(assignedValue)}</div>}
        {assigned.length === 0 ? <p style={{ fontSize: "13px", color: textSecondary }}>No garments assigned yet. Add some below.</p> :
          assigned.map(g => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate("garment-detail", g.id)}>
                {(g.photos || []).length > 0 ? <img src={g.photos[0].url} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "2px" }} /> : <div style={{ width: "36px", height: "36px", borderRadius: "2px", background: "#E8DCC0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: accentLight }}>✦</div>}
                <div><div style={{ fontSize: "13px", fontWeight: 500 }}>{g.name}</div><div style={{ fontSize: "11px", color: textSecondary }}>{g.sku} · {g.era} · {formatCurrency(g.price)}</div></div>
              </div>
              <button style={{ ...styles.btnDanger, padding: "4px 10px", fontSize: "11px" }} onClick={() => removeG(g.id)}>Remove</button>
            </div>
          ))}
        <hr style={styles.divider} />
        <h3 style={styles.h3}>Add Garments</h3>
        {unassigned.length === 0 ? <p style={{ fontSize: "13px", color: textSecondary }}>All garments are assigned to this event.</p> :
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {unassigned.map(g => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${border}` }}>
                <div style={{ fontSize: "13px" }}>{g.name} <span style={{ color: textSecondary }}>· {g.sku}</span></div>
                <button style={{ ...styles.btnOutline, padding: "4px 10px", fontSize: "11px" }} onClick={() => addG(g.id)}>+ Add</button>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}


// === EXPORT ===
// ==========================================
//  QUICK SALE — fast end-of-event reconciliation
// ==========================================
//
// Two modes:
//   1. "Pick a garment" — grid of sellable garments
//   2. "Record the sale" — big inputs to mark one Sold
//
// Reachable via navigate("quick-sale", id) where id is either:
//   - a garment id  → jump straight to record mode for that garment
//   - an event id   → grid filtered to that event's assigned garments
//   - null          → grid of all sellable garments
//
// Designed to be tapped quickly with a phone at the booth.
function QuickSaleView() {
  const ctx = useApp();
  const { garments, events, setGarments, setEvents, selectedId, navigate,
          fonts, bodyFont, border, textPrimary, textSecondary, accent,
          accentLight, softSage, teal, styles, statusColor } = ctx;

  // Resolve selectedId — could be a garment, an event, or nothing.
  const garmentMatch = selectedId ? garments.find(g => g.id === selectedId) : null;
  const eventMatch = selectedId ? events.find(e => e.id === selectedId) : null;

  // local state for the recording phase
  const [pickedId, setPickedId] = useState(garmentMatch ? garmentMatch.id : null);
  const [salePrice, setSalePrice] = useState("");
  const [saleNote, setSaleNote] = useState("");
  const [salePoint, setSalePoint] = useState(eventMatch ? eventMatch.id : "");

  // When user picks a garment from the grid, seed the price input with the
  // asking price. Also default the event selector to: the event we entered
  // from, the active event if any, or the next upcoming.
  useEffect(() => {
    if (!pickedId) return;
    const g = garments.find(x => x.id === pickedId);
    if (!g) return;
    setSalePrice((g.price || 0).toString());
    setSaleNote("");
    if (!salePoint) {
      const active = events.find(e => e.status === "Active");
      const eventForGarment = events.find(e => (e.garmentIds || []).includes(g.id) && ["Active", "Confirmed", "Planning"].includes(e.status));
      setSalePoint(eventForGarment?.id || active?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedId]);

  // Sellable = anything not already sold or out-of-circulation
  const sellableStatuses = ["In Collection", "Listed for Sale", "Reserved", "On Display"];
  const allSellable = garments.filter(g => sellableStatuses.includes(g.status));

  // If we entered with an event id, scope the picker to that event's pieces.
  // User can still flip to "all sellable" with the toggle.
  const [scope, setScope] = useState(eventMatch ? "event" : "all");
  const eventScopedGarments = eventMatch
    ? allSellable.filter(g => (eventMatch.garmentIds || []).includes(g.id))
    : [];
  const grid = scope === "event" && eventMatch ? eventScopedGarments : allSellable;

  const picked = garments.find(g => g.id === pickedId);

  const recordSale = () => {
    if (!picked) return;
    const raw = salePrice.trim();
    // Empty input is not a valid sale — bail with a gentle nudge rather
    // than recording a $0 sale by accident. Explicit "0" is allowed for
    // gifts and trades.
    if (raw === "") { window.alert("Enter a sale price (or 0 for a gift/trade)."); return; }
    const finalPrice = parseNum(raw);
    if (finalPrice < 0) { window.alert("Sale price can't be negative."); return; }
    setGarments(prev => prev.map(g => g.id === picked.id ? {
      ...g,
      status: "Sold",
      finalSalePrice: finalPrice,
      saleNote: saleNote.trim(),
    } : g));
    // If a sale point (event) is chosen and the garment isn't already
    // attached to it, attach it now so the event's reconciliation reflects
    // the sale. Functional updater so we don't trample other concurrent edits.
    if (salePoint) {
      setEvents(prev => prev.map(e =>
        e.id === salePoint && !(e.garmentIds || []).includes(picked.id)
          ? { ...e, garmentIds: [...(e.garmentIds || []), picked.id] }
          : e
      ));
    }
    // If we entered via a specific garment (came from event reconciliation),
    // return to that event so she can keep ticking off pieces. Otherwise
    // stay here for the next sale, just reset the form.
    if (garmentMatch && salePoint) {
      navigate("event-detail", salePoint);
    } else {
      setPickedId(null);
      setSalePrice("");
      setSaleNote("");
    }
  };

  return (
    <div>
      <button style={styles.backBtn} onClick={() => eventMatch ? navigate("event-detail", eventMatch.id) : navigate("dashboard")}>
        ← {eventMatch ? `Back to ${eventMatch.name}` : "Back to dashboard"}
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
        <div>
          <h1 style={styles.h1}>Quick Sale</h1>
          {eventMatch && <p style={{ fontFamily: fonts, fontSize: "14px", color: textSecondary, fontStyle: "italic", margin: "2px 0 0" }}>{eventMatch.name}</p>}
        </div>
        {eventMatch && (
          <div style={{ display: "flex", gap: "4px", border: `1px solid ${border}`, borderRadius: "2px", overflow: "hidden" }}>
            <button onClick={() => setScope("event")} style={{ padding: "6px 12px", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", background: scope === "event" ? accent : "transparent", color: scope === "event" ? "#fff" : textSecondary, border: "none", cursor: "pointer", fontFamily: bodyFont }}>
              This event
            </button>
            <button onClick={() => setScope("all")} style={{ padding: "6px 12px", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", background: scope === "all" ? accent : "transparent", color: scope === "all" ? "#fff" : textSecondary, border: "none", cursor: "pointer", fontFamily: bodyFont }}>
              All sellable
            </button>
          </div>
        )}
      </div>

      {/* Recording phase */}
      {picked ? (
        <div style={{ ...styles.card, borderTop: `3px solid ${softSage}` }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "20px" }}>
            {(picked.photos || []).length > 0
              ? <img src={picked.photos[0].url} alt="" style={{ width: "120px", height: "150px", objectFit: "cover", borderRadius: "2px", border: `1px solid ${border}`, flexShrink: 0 }} />
              : <div style={{ width: "120px", height: "150px", borderRadius: "2px", background: "#E8DCC0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: accentLight, border: `1px solid ${border}` }}>✦</div>
            }
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ fontSize: "10px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>{picked.sku}</div>
              <h2 style={{ ...styles.h2, marginBottom: "4px" }}>{picked.name}</h2>
              <div style={{ fontSize: "12px", color: textSecondary, fontStyle: "italic", marginBottom: "8px" }}>{picked.era} · {picked.category} · {picked.size}{picked.brand ? ` · ${picked.brand}` : ""}</div>
              <div style={{ fontFamily: fonts, fontSize: "28px", color: accent, fontWeight: 700 }}>{formatCurrency(picked.price)}</div>
              <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>asking</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
            <div>
              <label style={styles.label}>Sold For</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: textSecondary, fontSize: "20px", fontFamily: fonts }}>$</span>
                <input
                  type="number" min="0" step="0.01" inputMode="decimal"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  style={{ ...styles.input, paddingLeft: "30px", fontFamily: fonts, fontSize: "26px", fontWeight: 700, color: softSage, height: "56px" }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {parseNum(salePrice) > 0 && parseNum(salePrice) < picked.price && (
                <div style={{ fontSize: "11px", color: accentLight, fontStyle: "italic", marginTop: "4px" }}>
                  {Math.round((1 - parseNum(salePrice) / picked.price) * 100)}% off asking
                </div>
              )}
            </div>
            <div>
              <label style={styles.label}>Sold At Event</label>
              <select value={salePoint} onChange={e => setSalePoint(e.target.value)} style={{ ...styles.select, height: "56px" }}>
                <option value="">No event / direct sale</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({formatDate(ev.date)})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={styles.label}>Discount Note (optional)</label>
            <input
              value={saleNote}
              onChange={e => setSaleNote(e.target.value)}
              style={styles.input}
              placeholder="e.g. End of day deal, loyal customer, bundle"
            />
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", flexWrap: "wrap" }}>
            <button style={styles.btnOutline} onClick={() => { setPickedId(null); setSalePrice(""); setSaleNote(""); }}>
              ← Pick a different piece
            </button>
            <button
              onClick={recordSale}
              style={{ ...styles.btn, background: softSage, borderColor: softSage, padding: "12px 28px", fontSize: "13px" }}
            >
              ✓ Mark Sold for {formatCurrency(parseNum(salePrice))}
            </button>
          </div>
        </div>
      ) : (
        // Picker phase — grid of sellable garments
        <>
          <p style={styles.subtitle}>
            Tap a piece you sold. {grid.length} piece{grid.length !== 1 ? "s" : ""} available.
          </p>
          {grid.length === 0 ? (
            <div style={{ ...styles.card, textAlign: "center", padding: "32px" }}>
              <div style={{ fontSize: "28px", color: border, marginBottom: "8px" }}>✦</div>
              <p style={{ color: textSecondary, fontSize: "13px", margin: 0 }}>
                {scope === "event" && eventMatch
                  ? "All assigned pieces from this event are already sold or unavailable."
                  : "No sellable pieces in your collection yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
              {grid.map(g => (
                <button
                  key={g.id}
                  onClick={() => setPickedId(g.id)}
                  style={{
                    ...styles.card,
                    padding: "10px",
                    textAlign: "left",
                    cursor: "pointer",
                    border: `1px solid ${border}`,
                    borderTop: `3px solid ${border}`,
                    background: ctx.card,
                    fontFamily: bodyFont,
                    color: textPrimary,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderTopColor = softSage; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderTopColor = border; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {(g.photos || []).length > 0
                    ? <img src={g.photos[0].url} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: "2px", display: "block", marginBottom: "8px" }} />
                    : <div style={{ width: "100%", aspectRatio: "3/4", borderRadius: "2px", background: "#E8DCC0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: accentLight, marginBottom: "8px" }}>✦</div>
                  }
                  <div style={{ fontSize: "13px", fontFamily: fonts, fontWeight: 700, marginBottom: "2px", lineHeight: 1.3 }}>{g.name}</div>
                  <div style={{ fontSize: "11px", color: textSecondary, marginBottom: "4px" }}>{g.era} · {g.size}</div>
                  <div style={{ fontFamily: fonts, fontSize: "16px", color: accent, fontWeight: 700 }}>{formatCurrency(g.price)}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ==========================================
//  EXPORT
// ==========================================
function ExportView() {
  const { garments, setGarments, events, setEvents, view, navigate, selectedId, search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory, editingGarment, setEditingGarment, editingEvent, setEditingEvent, saveGarment, saveEvent, deleteGarment, deleteEvent, filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, lastBackupAt, setLastBackupAt, fonts, bodyFont, bg, card, border, textPrimary, textSecondary, accent, accentLight, warmRose, teal, tealLight, softSage, styles, statusColor, ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES } = useApp();
  const [separator, setSeparator] = useState("csv");
  const [copied, setCopied] = useState(null);
  const [restoreMsg, setRestoreMsg] = useState(null); // { kind: 'success'|'error'|'info', text }
  const fileInputRef = useRef(null);

  // --- Full backup handlers ---
  const handleBackup = () => {
    const json = buildBackupJSON(garments, events);
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    downloadJSON(json, `megans-marvels-backup-${date}.json`);
    setLastBackupAt(new Date().toISOString());
    setRestoreMsg({ kind: "success", text: `Backup saved. Keep it somewhere safe — Dropbox, email to yourself, or alongside your photos.` });
    setTimeout(() => setRestoreMsg(null), 6000);
  };

  // Triggered by the hidden <input type="file">. Reads, validates, and asks
  // for confirmation before clobbering current data.
  const handleRestoreFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // reset so picking the same file again re-fires onChange
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => setRestoreMsg({ kind: "error", text: "Could not read that file." });
    reader.onload = () => {
      const result = parseBackup(String(reader.result || ""));
      if (!result.ok) {
        setRestoreMsg({ kind: "error", text: result.error });
        return;
      }
      const meta = result.meta || {};
      const exportedAt = meta.exportedAt ? new Date(meta.exportedAt).toLocaleString() : "an unknown date";
      const summary = `Backup contains ${result.garments.length} garment${result.garments.length !== 1 ? "s" : ""} and ${result.events.length} event${result.events.length !== 1 ? "s" : ""}, exported ${exportedAt}.`;
      const currentSummary = `You currently have ${garments.length} garment${garments.length !== 1 ? "s" : ""} and ${events.length} event${events.length !== 1 ? "s" : ""}.`;
      const warning = (result.garments.length === 0 && result.events.length === 0)
        ? "\n\n⚠ Heads up: this backup is empty. Loading it would erase everything."
        : "";
      if (!window.confirm(`${summary}\n\n${currentSummary}\n\nReplace your current data with this backup? This cannot be undone.${warning}`)) {
        setRestoreMsg({ kind: "info", text: "Restore cancelled — your current data is unchanged." });
        return;
      }
      // Future-version detection — try to load anyway, but warn.
      if (meta.version && meta.version > BACKUP_VERSION) {
        if (!window.confirm(`This backup was made by a newer version of the app (v${meta.version}, this app is v${BACKUP_VERSION}). It might not load correctly. Continue anyway?`)) {
          setRestoreMsg({ kind: "info", text: "Restore cancelled." });
          return;
        }
      }
      setGarments(result.garments);
      setEvents(result.events);
      setRestoreMsg({ kind: "success", text: `Restored ${result.garments.length} garment${result.garments.length !== 1 ? "s" : ""} and ${result.events.length} event${result.events.length !== 1 ? "s" : ""} from backup.` });
    };
    reader.readAsText(file);
  };

  const sep = separator === "tsv" ? "\t" : ",";
  const q = (val) => {
    const s = val == null ? "" : String(val);
    if (separator === "csv" && (s.includes(",") || s.includes('"') || s.includes("\n")))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const garmentHeaders = ["SKU","Name","Era","Category","Size","Condition","Repair Status","Garment Status","Source Listed Price","Cost Paid","Asking Price","Final Sale Price","Discount Note","Profit","Brand","Materials","Colors","Measurements","Country of Origin","Flaws","Source","Source Detail","Date Acquired","Story","Tags","Notes"];
  const garmentRows = garments.map(g => {
    // Profit is meaningful only for actually-sold pieces. A $0 sale (gift,
    // trade) is still a sale; profit would be negative but real.
    const profit = g.status === "Sold" ? (g.finalSalePrice || 0) - (g.cost || 0) : "";
    return [
      g.sku, g.name, g.era, g.category, g.size, g.condition,
      g.repairStatus, g.status,
      g.sourceAskingPrice || "", g.cost, g.price,
      g.status === "Sold" ? (g.finalSalePrice || 0) : "", g.saleNote || "", profit,
      g.brand || "", g.materials || "", g.colors || "", g.measurements || "",
      g.countryOfOrigin || "", g.flaws || "",
      g.source || "", g.sourceDetail || "", g.dateAcquired || "",
      g.story || "", (g.tags || []).join("; "), g.notes || "",
    ].map(q).join(sep);
  });

  const eventHeaders = ["Event Name","Location","Start Date","End Date","Status","Booth Fee","Travel","Supplies","Other Fees","Total Fees","Notes","Fee Notes","Garment Count"];
  const eventRows = events.map(e => {
    const tf = (e.boothFee||0)+(e.travelCost||0)+(e.suppliesCost||0)+(e.otherFees||0);
    return [
      e.name, e.location, e.date, e.endDate||"", e.status,
      e.boothFee||0, e.travelCost||0, e.suppliesCost||0, e.otherFees||0, tf,
      e.notes||"", e.feeNotes||"", (e.garmentIds || []).length,
    ].map(q).join(sep);
  });

  const garmentCSV = [garmentHeaders.map(q).join(sep), ...garmentRows].join("\n");
  const eventCSV   = [eventHeaders.map(q).join(sep),   ...eventRows  ].join("\n");
  // Square format always uses CSV (Square's import tool requires it).
  const squareCSV = buildSquareCSV(garments);

  const copyText = (text, key) => {
    if (!navigator.clipboard) { window.alert("Clipboard not supported in this browser. Use the Download button instead."); return; }
    navigator.clipboard.writeText(text).then(
      () => { setCopied(key); setTimeout(() => setCopied(null), 2000); },
      () => window.alert("Could not copy to clipboard. Try the Download button instead.")
    );
  };

  const downloadFile = (text, filename) => {
    const ext = separator === "tsv" ? "tsv" : "csv";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const previewStyle = {
    fontFamily: "monospace", fontSize: "11px", background: "#F5F1E6",
    border: `1px solid ${border}`, borderRadius: "2px", padding: "14px 16px",
    overflowX: "auto", whiteSpace: "pre", color: "#4a4540",
    maxHeight: "200px", overflowY: "auto", lineHeight: 1.6,
    marginTop: "10px",
  };

  const previewLines = (csv, n = 4) => csv.split("\n").slice(0, n).join("\n") + (csv.split("\n").length > n ? `\n… (${csv.split("\n").length - n} more rows)` : "");

  return (
    <div>
      <h1 style={styles.h1}>Export Data</h1>
      <p style={styles.subtitle}>Back up your collection, send inventory to Square for events, or export everything as a spreadsheet.</p>

      {/* Hidden input — file picker for restore. Triggered by the Restore button. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleRestoreFile}
        style={{ display: "none" }}
      />

      {/* Status message from backup/restore */}
      {restoreMsg && (
        <div style={{
          marginBottom: "16px", padding: "10px 14px", borderRadius: "2px",
          fontSize: "13px", lineHeight: 1.6,
          background: restoreMsg.kind === "error" ? `${warmRose}15` : restoreMsg.kind === "success" ? `${softSage}15` : `${teal}10`,
          border: `1px solid ${restoreMsg.kind === "error" ? warmRose : restoreMsg.kind === "success" ? softSage : teal}40`,
          color: restoreMsg.kind === "error" ? warmRose : restoreMsg.kind === "success" ? softSage : teal,
          fontFamily: bodyFont,
        }}>
          {restoreMsg.kind === "success" && "✓ "}{restoreMsg.kind === "error" && "⚠ "}{restoreMsg.text}
        </div>
      )}

      {/* Full backup — most important "don't lose your work" action */}
      <div style={{ ...styles.card, borderTop: `3px solid ${accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <h3 style={{ ...styles.h3, margin: 0, color: accent }}>Full Backup</h3>
            <p style={{ fontSize: "12px", color: textSecondary, margin: "3px 0 0", fontStyle: "italic" }}>
              {lastBackupAt
                ? <>Last backup: {new Date(lastBackupAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {(() => {
                    const days = Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000);
                    return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
                  })()}</>
                : <>You haven't backed up yet. Save a copy somewhere safe.</>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ ...styles.btnOutline, fontSize: "12px", padding: "6px 14px" }}
            >
              ↑ Restore from file
            </button>
            <button
              onClick={handleBackup}
              style={{ ...styles.btn, fontSize: "12px", padding: "6px 14px" }}
            >
              ↓ Download backup
            </button>
          </div>
        </div>
        <div style={{ marginTop: "14px", padding: "12px 14px", background: bg, borderRadius: "2px", fontSize: "12px", color: textSecondary, lineHeight: 1.7 }}>
          <strong style={{ color: textPrimary }}>What this is:</strong> a single <code style={{ fontFamily: "monospace", fontSize: "11px", background: card, padding: "1px 5px", borderRadius: "2px" }}>.json</code> file with everything — your {garments.length} garment{garments.length !== 1 ? "s" : ""}, {events.length} event{events.length !== 1 ? "s" : ""}, photos, stories, prices, sale records, all of it.
          <br /><br />
          <strong style={{ color: textPrimary }}>Use it to:</strong>
          <br />
          · <em>Back up</em> — download regularly and keep the file somewhere safe (Dropbox, Drive, email to yourself).
          <br />
          · <em>Move devices</em> — download from your laptop, upload onto your phone, and you'll have the same collection on both.
          <br />
          · <em>Recover</em> — if something goes wrong, restore from the most recent backup file.
          <br /><br />
          <strong style={{ color: warmRose }}>Heads up:</strong> Restoring <em>replaces</em> your current data. If you've made changes since the backup was saved, those changes will be overwritten.
        </div>
      </div>

      {/* Square POS export — featured */}
      <div style={{ ...styles.card, borderTop: `3px solid ${teal}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
          <div>
            <h3 style={{ ...styles.h3, margin: 0, color: teal }}>Square Item Library</h3>
            <p style={{ fontSize: "12px", color: textSecondary, margin: "3px 0 0", fontStyle: "italic" }}>Ready to import into Square Dashboard for sales at events</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...styles.btnOutline, fontSize: "12px", padding: "6px 14px" }} onClick={() => copyText(squareCSV, "square-all")}>
              {copied === "square-all" ? "✓ Copied!" : "Copy"}
            </button>
            <button style={{ ...styles.btn, fontSize: "12px", padding: "6px 14px", background: teal, borderColor: teal }} onClick={() => downloadCSV(squareCSV, "square-import-all.csv")}>
              ↓ Download for Square
            </button>
          </div>
        </div>
        <p style={{ fontSize: "12px", color: textSecondary, lineHeight: 1.7, marginTop: "10px", marginBottom: 0 }}>
          To import: in Square Dashboard, go to <strong>Items &amp; services → Items → Item library</strong>, then <strong>Actions → Import library</strong>. Drop in this file. Square will use the SKU to update existing items or create new ones, so you can re-export safely.
          <br /><br />
          <em>Heads up: don't open this CSV in Excel directly — it can mangle SKUs. Drop it straight into Square's import tool, or open it in Google Sheets first.</em>
        </p>
        <div style={previewStyle}>{previewLines(squareCSV, 3)}</div>
      </div>

      {/* General data export — for backup / spreadsheets */}
      <div style={{ marginTop: "32px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ flex: 1, height: "1px", background: border }} />
        <span style={{ fontSize: "10px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: bodyFont }}>Spreadsheet Exports</span>
        <div style={{ flex: 1, height: "1px", background: border }} />
      </div>

      {/* Format picker */}
      <div style={{ ...styles.card, marginBottom: "20px" }}>
        <h3 style={styles.h3}>Format</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[["csv", "CSV  —  comma-separated  (Excel, Google Sheets, Numbers)"], ["tsv", "TSV  —  tab-separated  (paste directly into spreadsheet cells)"]].map(([val, label]) => (
            <label key={val} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: separator === val ? accent : textSecondary, fontWeight: separator === val ? 600 : 400 }}>
              <input type="radio" name="sep" value={val} checked={separator === val} onChange={() => setSeparator(val)} style={{ accentColor: accent }} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Garments — full data */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          <div>
            <h3 style={{ ...styles.h3, margin: 0 }}>Garments</h3>
            <p style={{ fontSize: "12px", color: textSecondary, margin: "3px 0 0" }}>{garments.length} piece{garments.length !== 1 ? "s" : ""} · {garmentHeaders.length} columns · all the detail</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...styles.btnOutline, fontSize: "12px", padding: "6px 14px" }} onClick={() => copyText(garmentCSV, "garments")}>
              {copied === "garments" ? "✓ Copied!" : "Copy"}
            </button>
            <button style={{ ...styles.btn, fontSize: "12px", padding: "6px 14px" }} onClick={() => downloadFile(garmentCSV, "vintage-garments")}>
              ↓ Download
            </button>
          </div>
        </div>
        <div style={previewStyle}>{previewLines(garmentCSV)}</div>
      </div>

      {/* Events — full data */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          <div>
            <h3 style={{ ...styles.h3, margin: 0 }}>Events</h3>
            <p style={{ fontSize: "12px", color: textSecondary, margin: "3px 0 0" }}>{events.length} event{events.length !== 1 ? "s" : ""} · {eventHeaders.length} columns</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...styles.btnOutline, fontSize: "12px", padding: "6px 14px" }} onClick={() => copyText(eventCSV, "events")}>
              {copied === "events" ? "✓ Copied!" : "Copy"}
            </button>
            <button style={{ ...styles.btn, fontSize: "12px", padding: "6px 14px" }} onClick={() => downloadFile(eventCSV, "vintage-events")}>
              ↓ Download
            </button>
          </div>
        </div>
        <div style={previewStyle}>{previewLines(eventCSV)}</div>
      </div>

      {/* Tips */}
      <div style={{ ...styles.card, background: `${accent}08`, border: `1px solid ${accent}20` }}>
        <h3 style={{ ...styles.h3, fontSize: "14px", marginBottom: "6px" }}>Tips</h3>
        <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: "12px", color: textSecondary, lineHeight: 2 }}>
          <li><strong>Square workflow:</strong> Import the Square file before each event. After the event, mark sold pieces in this app using the Quick Sale or event reconciliation views.</li>
          <li><strong>Per-event Square export:</strong> If you only want garments assigned to a specific event, open that event's detail page — there's a "Pre-event prep" section with a smaller, focused download.</li>
          <li><strong>Google Sheets:</strong> File → Import → paste CSV, or use TSV and paste directly into a blank sheet.</li>
          <li><strong>Excel / Numbers:</strong> Download the CSV file, then open it — it'll recognise the format automatically.</li>
          <li><strong>Backup:</strong> Use the <em>Full Backup</em> section above for the canonical "save everything" file. The Garments &amp; Events spreadsheets are great for analysis but don't capture every field.</li>
          <li>Tags are exported as semicolon-separated values within a single cell so they don't disrupt the column structure.</li>
        </ul>
      </div>
    </div>
  );
}


// --- Main App ---
export default function VintageInventory() {
  // ---- Persisted data (survives page close): garments + events ----
  // Loaded records are run through normalize* so missing fields (from
  // older saved data) get safe defaults. This protects against schema
  // drift when new fields are added to the model.
  const [garments, setGarments] = useState(() => {
    try {
      const s = localStorage.getItem("vws-garments");
      const raw = s ? JSON.parse(s) : SAMPLE_GARMENTS;
      return Array.isArray(raw) ? raw.map(normalizeGarment) : SAMPLE_GARMENTS.map(normalizeGarment);
    } catch { return SAMPLE_GARMENTS.map(normalizeGarment); }
  });
  const [events, setEvents] = useState(() => {
    try {
      const s = localStorage.getItem("vws-events");
      const raw = s ? JSON.parse(s) : SAMPLE_EVENTS;
      return Array.isArray(raw) ? raw.map(normalizeEvent) : SAMPLE_EVENTS.map(normalizeEvent);
    } catch { return SAMPLE_EVENTS.map(normalizeEvent); }
  });

  // ---- Persisted UI session (survives page refresh, not browser close) ----
  // Stored in sessionStorage so refreshing the page (or hot-reload during
  // development) keeps you on the same view with the same in-progress
  // edits. Closing the tab returns to a fresh dashboard.
  const loadSession = (key, fallback) => {
    try {
      const s = sessionStorage.getItem(key);
      return s !== null ? JSON.parse(s) : fallback;
    } catch { return fallback; }
  };

  const [view, setView] = useState(() => loadSession("vws-view", "dashboard"));
  const [selectedId, setSelectedId] = useState(() => loadSession("vws-selectedId", null));
  const [search, setSearch] = useState(() => loadSession("vws-search", ""));
  const [filterEra, setFilterEra] = useState(() => loadSession("vws-filterEra", ""));
  const [filterStatus, setFilterStatus] = useState(() => loadSession("vws-filterStatus", ""));
  const [filterCategory, setFilterCategory] = useState(() => loadSession("vws-filterCategory", ""));
  const [editingGarment, setEditingGarment] = useState(() => loadSession("vws-editingGarment", null));
  const [editingEvent, setEditingEvent] = useState(() => loadSession("vws-editingEvent", null));

  // ---- Last backup tracking (persisted, used to nudge for fresh backups) ----
  const [lastBackupAt, setLastBackupAt] = useState(() => {
    try { return localStorage.getItem("vws-lastBackupAt") || null; }
    catch { return null; }
  });

  // Persist data to localStorage whenever it changes
  useEffect(() => { try { localStorage.setItem("vws-garments", JSON.stringify(garments)); } catch {} }, [garments]);
  useEffect(() => { try { localStorage.setItem("vws-events",   JSON.stringify(events));   } catch {} }, [events]);
  useEffect(() => { try { lastBackupAt ? localStorage.setItem("vws-lastBackupAt", lastBackupAt) : localStorage.removeItem("vws-lastBackupAt"); } catch {} }, [lastBackupAt]);

  // Persist UI session state to sessionStorage
  useEffect(() => { try { sessionStorage.setItem("vws-view", JSON.stringify(view)); } catch {} }, [view]);
  useEffect(() => { try { sessionStorage.setItem("vws-selectedId", JSON.stringify(selectedId)); } catch {} }, [selectedId]);
  useEffect(() => { try { sessionStorage.setItem("vws-search", JSON.stringify(search)); } catch {} }, [search]);
  useEffect(() => { try { sessionStorage.setItem("vws-filterEra", JSON.stringify(filterEra)); } catch {} }, [filterEra]);
  useEffect(() => { try { sessionStorage.setItem("vws-filterStatus", JSON.stringify(filterStatus)); } catch {} }, [filterStatus]);
  useEffect(() => { try { sessionStorage.setItem("vws-filterCategory", JSON.stringify(filterCategory)); } catch {} }, [filterCategory]);
  useEffect(() => { try { sessionStorage.setItem("vws-editingGarment", JSON.stringify(editingGarment)); } catch {} }, [editingGarment]);
  useEffect(() => { try { sessionStorage.setItem("vws-editingEvent", JSON.stringify(editingEvent)); } catch {} }, [editingEvent]);

  const navigate = (v, id) => { setView(v); setSelectedId(id != null ? id : null); };

  // --- Computed ---
  const totalCost = garments.reduce((s, g) => s + (g.cost || 0), 0);
  const totalValue = garments.reduce((s, g) => s + (g.price || 0), 0);
  const totalEventCosts = events.reduce((s, e) => s + (e.boothFee || 0) + (e.travelCost || 0) + (e.suppliesCost || 0) + (e.otherFees || 0), 0);
  const needsRepair = garments.filter(g => ["In Repair", "At Tailor", "Pending Assessment"].includes(g.repairStatus));
  const needsStory = garments.filter(g => !g.story || g.story.trim().length < 20);
  const needsPhotos = garments.filter(g => !g.photos || g.photos.length === 0);
  const upcomingEvents = events.filter(e => ["Planning", "Confirmed"].includes(e.status)).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const soldCount = garments.filter(g => g.status === "Sold").length;

  const filtered = garments.filter(g => {
    if (search && !`${g.name} ${g.sku} ${g.brand} ${g.era} ${(g.tags || []).join(" ")} ${g.story || ""} ${g.colors || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEra && g.era !== filterEra) return false;
    if (filterStatus && g.status !== filterStatus) return false;
    if (filterCategory && g.category !== filterCategory) return false;
    return true;
  });

  // (emptyGarment / emptyEvent live at module scope so views can use them
  // without needing them in context. They're already normalized templates.)

  const saveGarment = (g) => {
    // Don't mutate the input — make a copy first.
    const next = { ...g, sku: g.sku || genSKU(g.era, g.category) };
    setGarments(prev => {
      const idx = prev.findIndex(x => x.id === next.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = next; return n; }
      return [...prev, next];
    });
    setEditingGarment(null);
    navigate("garment-detail", next.id);
  };
  const deleteGarment = (id) => {
    setGarments(prev => prev.filter(g => g.id !== id));
    setEvents(prev => prev.map(e => ({ ...e, garmentIds: (e.garmentIds || []).filter(gid => gid !== id) })));
    navigate("inventory");
  };
  const saveEvent = (e) => {
    setEvents(prev => {
      const idx = prev.findIndex(x => x.id === e.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = e; return n; }
      return [...prev, e];
    });
    setEditingEvent(null);
    navigate("event-detail", e.id);
  };
  const deleteEvent = (id) => { setEvents(prev => prev.filter(e => e.id !== id)); navigate("events"); };

  // --- Styles --- (Megan's Marvels palette: carmine, teal, sage, gold, cream, chocolate)
  const fonts = `'Playfair Display', 'Georgia', 'Times New Roman', serif`;
  const bodyFont = `'Libre Baskerville', 'Georgia', serif`;
  const bg = "#F5F1E6";           // soft cream (palette)
  const card = "#FBF8EE";         // slightly lighter cream for cards
  const border = "#C59A3B";       // warm gold/ochre (palette)
  const textPrimary = "#4B2E20";  // deep chocolate (palette)
  const textSecondary = "#7A5C3A"; // warm umber for secondary text
  const accent = "#A52A0A";       // carmine (palette)
  const accentLight = "#D4622A";  // burnt orange — derived hover state
  const warmRose = "#C4837A";     // dusty rose (kept for badge use)
  const teal = "#1D6B6B";         // deep teal (palette)
  const tealLight = "#2E9E9E";    // lighter teal — derived
  const softSage = "#5AA189";     // sage green (palette)

  const styles = {
    app: { fontFamily: bodyFont, background: bg, minHeight: "100vh", color: textPrimary, fontSize: "14px", lineHeight: 1.6 },
    nav: { display: "flex", alignItems: "center", gap: "6px", padding: "12px 24px", borderBottom: `2px solid ${border}`, background: textPrimary, position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap" },
    navBtn: (active) => ({ padding: "6px 14px", borderRadius: "3px", border: active ? `1px solid ${accentLight}` : "1px solid transparent", background: active ? accentLight : "transparent", color: active ? "#fff" : border, cursor: "pointer", fontSize: "12px", fontWeight: 500, fontFamily: bodyFont, transition: "all 0.2s", letterSpacing: "0.05em", textTransform: "uppercase" }),
    page: { maxWidth: "1100px", margin: "0 auto", padding: "24px 20px 60px" },
    h1: { fontFamily: fonts, fontSize: "32px", fontWeight: 700, marginBottom: "4px", letterSpacing: "-0.01em", color: textPrimary },
    h2: { fontFamily: fonts, fontSize: "22px", fontWeight: 700, marginBottom: "4px", letterSpacing: "0em", color: textPrimary },
    h3: { fontFamily: fonts, fontSize: "17px", fontWeight: 700, marginBottom: "8px", color: textPrimary, letterSpacing: "0.01em" },
    subtitle: { color: textSecondary, fontSize: "13px", marginBottom: "24px", fontStyle: "italic" },
    card: { background: card, borderRadius: "2px", border: `1px solid ${border}`, borderTop: `3px solid ${accent}`, padding: "20px", marginBottom: "16px" },
    cardHover: { background: card, borderRadius: "2px", border: `1px solid ${border}`, borderLeft: `3px solid ${border}`, padding: "16px 20px", marginBottom: "8px", cursor: "pointer", transition: "all 0.2s" },
    grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" },
    grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" },
    stat: { background: card, borderRadius: "2px", border: `1px solid ${border}`, padding: "16px", textAlign: "center" },
    statNum: { fontFamily: fonts, fontSize: "32px", color: accent, fontWeight: 400, lineHeight: 1.1 },
    statLabel: { fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" },
    input: { width: "100%", padding: "10px 14px", borderRadius: "2px", border: `1px solid ${border}`, fontFamily: bodyFont, fontSize: "14px", background: bg, color: textPrimary, outline: "none", boxSizing: "border-box" },
    select: { width: "100%", padding: "10px 14px", borderRadius: "2px", border: `1px solid ${border}`, fontFamily: bodyFont, fontSize: "14px", background: bg, color: textPrimary, outline: "none", boxSizing: "border-box", appearance: "none" },
    textarea: { width: "100%", padding: "9px 12px", borderRadius: "2px", border: `1px solid ${border}`, fontFamily: bodyFont, fontSize: "13px", background: bg, color: textPrimary, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: "80px", lineHeight: 1.7 },
    btn: { padding: "9px 20px", borderRadius: "2px", border: `1px solid ${accent}`, background: accent, color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 700, fontFamily: bodyFont, letterSpacing: "0.08em", textTransform: "uppercase" },
    btnOutline: { padding: "9px 20px", borderRadius: "2px", border: `1px solid ${border}`, background: "transparent", color: textSecondary, cursor: "pointer", fontSize: "11px", fontWeight: 600, fontFamily: bodyFont, letterSpacing: "0.04em", textTransform: "uppercase" },
    btnDanger: { padding: "7px 14px", borderRadius: "2px", border: `1px solid #C4837A`, background: "#FAF0EE", color: "#8B1A1A", cursor: "pointer", fontSize: "11px", fontWeight: 600, fontFamily: bodyFont },
    label: { display: "block", fontSize: "11px", fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px", fontFamily: bodyFont },
    tag: { display: "inline-block", padding: "2px 9px", borderRadius: "1px", background: `${teal}18`, border: `1px solid ${tealLight}50`, color: teal, fontSize: "11px", marginRight: "4px", marginBottom: "4px", fontFamily: bodyFont, letterSpacing: "0.03em" },
    divider: { border: "none", borderTop: `1px solid ${border}`, margin: "16px 0" },
    backBtn: { background: "none", border: "none", color: textSecondary, cursor: "pointer", fontSize: "12px", marginBottom: "14px", padding: "4px 0", fontFamily: bodyFont, fontStyle: "italic", letterSpacing: "0.02em" },
  };

  // All views (TagBrowser, DashboardView, InventoryView, GarmentDetail,
  // EventsView, EventDetail, ExportView) live at module scope above so
  // their identity is stable across re-renders. This is required for
  // hooks inside them to retain state and for inputs to keep focus.
  //
  // Memoizing ctxValue means consumers only re-render when something
  // they care about actually changed, not on every parent render.
  const ctxValue = useMemo(() => ({
    garments, setGarments, events, setEvents,
    view, navigate, selectedId,
    search, setSearch, filterEra, setFilterEra, filterStatus, setFilterStatus, filterCategory, setFilterCategory,
    editingGarment, setEditingGarment, editingEvent, setEditingEvent,
    saveGarment, saveEvent, deleteGarment, deleteEvent,
    filtered, needsRepair, needsStory, needsPhotos, upcomingEvents, soldCount,
    totalCost, totalValue, totalEventCosts,
    lastBackupAt, setLastBackupAt,
    fonts, bodyFont, bg, card, border, textPrimary, textSecondary,
    accent, accentLight, warmRose, teal, tealLight, softSage,
    styles, statusColor,
    ERAS, CATEGORIES, SIZES, CONDITIONS, REPAIR_STATUSES, GARMENT_STATUSES, SOURCES, EVENT_STATUSES,
  }), [
    garments, events, view, selectedId, search, filterEra, filterStatus, filterCategory,
    editingGarment, editingEvent, filtered, needsRepair, needsStory, needsPhotos,
    upcomingEvents, soldCount, totalCost, totalValue, totalEventCosts, lastBackupAt, styles,
  ]);

  return (
    <AppCtx.Provider value={ctxValue}>
    <div style={styles.app}>
      <nav style={styles.nav}>
        <span style={{ fontFamily: fonts, fontSize: "17px", marginRight: "12px", color: bg, fontStyle: "italic", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Logo placeholder — replace SVG with actual logo file */}
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="34" height="34" rx="1" stroke="#C59A3B" strokeWidth="1.5" fill="none"/>
            <rect x="4" y="4" width="28" height="28" rx="0.5" stroke="#C59A3B" strokeWidth="0.5" fill="none"/>
            <text x="18" y="14" textAnchor="middle" fontFamily="Georgia, serif" fontSize="7" fill="#C59A3B" letterSpacing="0.5">MEGAN'S</text>
            <line x1="7" y1="17" x2="29" y2="17" stroke="#A52A0A" strokeWidth="0.75"/>
            <text x="18" y="24" textAnchor="middle" fontFamily="Georgia, serif" fontSize="6" fill="#D4622A" letterSpacing="0.5">Marvels</text>
            <circle cx="18" cy="29" r="1.5" fill="#1D6B6B"/>
            <circle cx="12" cy="29" r="1" fill="#5AA189" opacity="0.7"/>
            <circle cx="24" cy="29" r="1" fill="#5AA189" opacity="0.7"/>
          </svg>
          Megan's Marvels
        </span>
        <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
          {[["dashboard", "Dashboard"], ["inventory", "Inventory"], ["events", "Events"], ["quick-sale", "Sales"], ["qr-labels", "QR Labels"], ["export", "Export"]].map(([v, l]) => (
            <button key={v} style={styles.navBtn(view === v || (v === "inventory" && view === "garment-detail") || (v === "inventory" && view === "add-garment") || (v === "events" && view === "event-detail") || (v === "events" && view === "add-event"))} onClick={() => navigate(v)}>{l}</button>
          ))}
        </div>
      </nav>
      <div style={styles.page}>
        {view === "dashboard" && <DashboardView />}
        {view === "inventory" && <InventoryView />}
        {view === "garment-detail" && <GarmentDetail />}
        {view === "add-garment" && <GarmentForm />}
        {view === "events" && <EventsView />}
        {view === "event-detail" && <EventDetail />}
        {view === "add-event" && <EventForm />}
        {view === "quick-sale" && <QuickSaleView />}
        {view === "qr-labels" && <QRLabelsView />}
        {view === "export" && <ExportView />}
      </div>
    </div>
    </AppCtx.Provider>
  );
}
