import { useState } from "react";
import { ProgressBar, Tag, AchCard } from "../components/ui.jsx";
import { LEVELS, ACHIEVEMENTS } from "../data/constants.js";

export default function TrilhaTab({ unlocked, toggleA, currentLevel }) {
  const [expandedLevel, setExpandedLevel] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {LEVELS.map(lvl => {
        const lvlAchs = ACHIEVEMENTS.filter(a => a.level === lvl.id);
        const doneCount = lvlAchs.filter(a => unlocked.has(a.id)).length;
        const expanded = expandedLevel === lvl.id;
        const xpTotal = lvlAchs.reduce((s, a) => s + a.xp, 0);
        const isActive = currentLevel.id === lvl.id;
        const isComplete = doneCount === lvlAchs.length;

        return (
          <div key={lvl.id} style={{ background: "#0a0a0f", border: `1px solid ${isActive ? lvl.color + "44" : "#1a1a2e"}`, borderRadius: 4, overflow: "hidden", transition: "all 0.2s" }}>
            <div onClick={() => setExpandedLevel(expanded ? null : lvl.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, userSelect: "none" }}>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 28, color: lvl.color, width: 28, textAlign: "center", flexShrink: 0 }}>{lvl.id}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: isActive ? "#f0f0ff" : "#666", fontWeight: 700 }}>{lvl.title}</span>
                  {isActive && <Tag color={lvl.color}>ATUAL</Tag>}
                  {isComplete && <Tag color="#00ff88">COMPLETO</Tag>}
                  <span style={{ fontSize: 12, color: "#aaa", marginLeft: "auto" }}>{doneCount}/{lvlAchs.length} conquistas · {xpTotal} XP</span>
                </div>
                <ProgressBar value={doneCount} max={lvlAchs.length} color={lvl.color} height={4} />
              </div>
              <span style={{ color: "#aaa", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
            </div>
            {expanded && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1a1a2e" }}>
                <div style={{ fontSize: 12, color: "#bbb", letterSpacing: 1, margin: "12px 0 10px" }}>{lvl.subtitle}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {lvlAchs.map(a => (
                    <AchCard key={a.id} ach={a} done={unlocked.has(a.id)} onToggle={toggleA} levelColor={lvl.color} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
