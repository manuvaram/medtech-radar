"use client";
import { useState, useEffect } from "react";

const THEMES = ["Urology","Diabetes","Structural Heart","Robotics","Reimbursement","M&A / PE"];
const CADENCES = ["daily","weekly","monthly","quarterly"];
const COMPANIES = "MDT, Stryker, BSX, Convatec, Coloplast, ResMed, Adapt Health, J&J MedTech, Abbott, Hollister, Wellspect";

const TYPE_COLORS = {
  Earnings:   { bg: "#E6F1FB", text: "#185FA5" },
  Regulatory: { bg: "#E1F5EE", text: "#0F6E56" },
  "M&A":      { bg: "#FBEAF0", text: "#993556" },
  Market:     { bg: "#FAEEDA", text: "#854F0B" },
  Personnel:  { bg: "#EEEDFE", text: "#533AB7" },
};

const CO_COLORS = {
  MDT:            { bg: "#E1F5EE", text: "#0F6E56" },
  Stryker:        { bg: "#E6F1FB", text: "#185FA5" },
  BSX:            { bg: "#E6F1FB", text: "#185FA5" },
  Convatec:       { bg: "#EAF3DE", text: "#3B6D11" },
  Coloplast:      { bg: "#EAF3DE", text: "#3B6D11" },
  ResMed:         { bg: "#EEEDFE", text: "#533AB7" },
  "Adapt Health": { bg: "#FAEEDA", text: "#854F0B" },
  default:        { bg: "#F1EFE8", text: "#5F5E5A" },
};

export default function Home() {
  // Primary filter: theme. Secondary: cadence.
  const [activeTheme, setActiveTheme] = useState("Urology");
  const [activeCadence, setActiveCadence] = useState("daily");

  // Cache of fetched signals per cadence
  const [signalCache, setSignalCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [today, setToday] = useState("");
  const [cached, setCached] = useState(false);

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }, []);

  // All signals for current cadence
  const allSignals = signalCache[activeCadence] || [];

  // Filtered by active theme — flexible matching
  const filtered = allSignals.filter(s => {
    if (!s.theme) return true;
    const t = s.theme.toLowerCase();
    const a = activeTheme.toLowerCase();
    return t.includes(a) || a.includes(t) || t === a;
  });

  const maCount = allSignals.filter(s => s.type === "M&A" || s.type === "Regulatory").length;

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    setCached(false);
    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cadence: activeCadence,
          themes: THEMES.join(", "),
          companies: COMPANIES,
        }),
      });
      const data = await res.json();
      setSignalCache(prev => ({ ...prev, [activeCadence]: data.signals || [] }));
      setCached(data.cached || false);
    } catch {
      setError("Failed to fetch signals. Check your API key.");
    }
    setLoading(false);
  };

  const coColor = (co) => CO_COLORS[co] || CO_COLORS.default;
  const typeColor = (type) => TYPE_COLORS[type] || TYPE_COLORS.Market;
  const hasFetched = !!signalCache[activeCadence];

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ borderBottom: "0.5px solid #e5e5e3", padding: "14px 16px 0", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            MedTech Radar <span style={{ color: "#888", fontWeight: 400, fontSize: 13 }}>by Manu</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {cached && <span style={{ fontSize: 10, color: "#888", background: "#f5f5f3", padding: "2px 6px", borderRadius: 10 }}>cached</span>}
            <div style={{ fontSize: 11, color: "#888", background: "#f5f5f3", padding: "3px 9px", borderRadius: 20, border: "0.5px solid #e5e5e3" }}>{today}</div>
          </div>
        </div>

        {/* Theme tabs — primary filter */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none", marginBottom: 0 }}>
          {THEMES.map(t => (
            <button key={t} onClick={() => setActiveTheme(t)}
              style={{ fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: "20px 20px 0 0", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: "transparent", color: activeTheme===t ? "#111" : "#888", borderBottom: activeTheme===t ? "2px solid #111" : "2px solid transparent", transition: "all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Cadence selector — secondary */}
        <div style={{ display: "flex", gap: 6 }}>
          {CADENCES.map(c => (
            <button key={c} onClick={() => setActiveCadence(c)}
              style={{ fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 20, border: `0.5px solid ${activeCadence===c ? "#111" : "#e5e5e3"}`, background: activeCadence===c ? "#111" : "transparent", color: activeCadence===c ? "#fff" : "#888", cursor: "pointer", transition: "all 0.15s" }}>
              {c.charAt(0).toUpperCase()+c.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "#f5f5f3", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 500 }}>{hasFetched ? filtered.length : "—"}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{activeTheme} signals</div>
          </div>
          <div style={{ background: "#f5f5f3", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 500 }}>{hasFetched ? maCount : "—"}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>M&A / regulatory</div>
          </div>
        </div>

        {/* Feed */}
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888" }}>
          {activeTheme} · {activeCadence}
        </div>

        {loading && [100,80,90].map((h,i) => (
          <div key={i} style={{ background: "#f5f5f3", borderRadius: 12, height: h, opacity: 1-i*0.2, animation: "pulse 1.2s ease-in-out infinite" }} />
        ))}

        {error && <div style={{ textAlign: "center", padding: "24px 16px", color: "#993556", fontSize: 13 }}>{error}</div>}

        {!loading && hasFetched && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#888", fontSize: 13, lineHeight: 1.8 }}>
            No {activeTheme} signals found for {activeCadence} window.<br />
            <span style={{ fontSize: 12 }}>Try a wider cadence or hit Refresh.</span>
          </div>
        )}

        {!loading && !hasFetched && !error && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#888", fontSize: 13, lineHeight: 1.6 }}>
            Tap "Fetch Signals" to pull live intelligence<br />for your MedTech universe
          </div>
        )}

        {!loading && filtered.map((s,i) => (
          <div key={i} style={{ background: "#fff", border: "0.5px solid #e5e5e3", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 6, background: coColor(s.co).bg, color: coColor(s.co).text }}>{s.co}</span>
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, marginLeft: "auto", background: typeColor(s.type).bg, color: typeColor(s.type).text }}>{s.type}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#111", lineHeight: 1.4 }}>{s.headline}</div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, borderLeft: "2px solid #e5e5e3", paddingLeft: 8, fontStyle: "italic" }}>{s.pov}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#aaa" }}>{s.time}{s.source ? ` · ${s.source}` : ""}</span>
              <button style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, border: "0.5px solid #e5e5e3", background: "none", color: "#666", cursor: "pointer" }}
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(s.headline+" "+s.co)}`,"_blank")}>
                Search ↗
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fetch button */}
      <div style={{ padding: "12px 16px", background: "#fff", borderTop: "0.5px solid #e5e5e3", position: "sticky", bottom: 0 }}>
        <button onClick={fetchSignals} disabled={loading}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: loading ? "#ccc" : "#111", color: "#fff", fontSize: 14, fontWeight: 500, cursor: loading ? "default" : "pointer" }}>
          {loading ? "Fetching live signals…" : hasFetched ? "Refresh Signals" : "Fetch Signals"}
        </button>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}*{box-sizing:border-box}::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
