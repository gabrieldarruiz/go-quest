// Componentes de UI reutilizáveis

export function ProgressBar({ value, max, color = "#a855f7", height = 8 }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ background: "#111", border: "1px solid #1a1a2e", height, borderRadius: 2, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}66`, transition: "width 0.8s ease", borderRadius: 2 }} />
    </div>
  );
}

export function Tag({ color, children }) {
  return <span style={{ fontSize: 14, color, border: `1px solid ${color}44`, padding: "1px 6px", borderRadius: 2, letterSpacing: 1 }}>{children}</span>;
}

export function AchCard({ ach, done, onToggle, levelColor }) {
  return (
    <div onClick={() => onToggle(ach.id)} style={{
      background: done ? `${levelColor}0a` : "#0a0a0f",
      border: `1px solid ${done ? levelColor + "44" : "#1a1a2e"}`,
      borderRadius: 4, padding: "11px 13px", cursor: "pointer",
      transition: "all 0.2s", opacity: done ? 1 : 0.55,
      position: "relative", overflow: "hidden", userSelect: "none",
    }}>
      {done && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${levelColor}88, transparent)`, pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 16, color: done ? levelColor : "#2a2a3e", flexShrink: 0, lineHeight: 1.4 }}>{ach.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: "monospace", fontSize: 14, color: done ? "#f0f0ff" : "#333", fontWeight: 700 }}>{ach.title}</span>
            <span style={{ fontFamily: "monospace", fontSize: 13, color: done ? levelColor : "#222", flexShrink: 0 }}>+{ach.xp}xp</span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: done ? "#5a7a8a" : "#222", lineHeight: 1.5 }}>{ach.desc}</div>
        </div>
      </div>
    </div>
  );
}
