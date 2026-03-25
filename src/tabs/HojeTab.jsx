import { ProgressBar } from "../components/ui.jsx";
import { ACHIEVEMENTS, MILESTONES, DIFF_LABEL, DIFF_COLOR, CAT_ICON } from "../data/constants.js";

export default function HojeTab({ dailyGoals, todayDone, loading, toggleG, toggleA, unlocked, currentLevel }) {
  return (
    <div className="mobile-full" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Metas */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 14 }}>// METAS DO DIA</div>
        {dailyGoals.length === 0 && loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "9px 10px", marginBottom: 4, borderRadius: 3, background: "#0d0d15", border: "1px solid #1a1a2e", opacity: 0.5 + i * 0.08 }}>
                <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#1a1a2e", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 11, width: `${60 + i * 7}%`, background: "#1a1a2e", borderRadius: 2, marginBottom: 6 }} />
                  <div style={{ height: 9, width: `${40 + i * 5}%`, background: "#111", borderRadius: 2 }} />
                </div>
                <div style={{ width: 32, height: 11, background: "#1a1a2e", borderRadius: 2, flexShrink: 0 }} />
              </div>
            ))
          : dailyGoals.length === 0
            ? <div style={{ padding: "24px 0", textAlign: "center", color: "#444", fontSize: 13 }}>Nenhuma meta disponível para o seu nível.</div>
            : dailyGoals.map((g) => {
                const done = todayDone.has(g.goal_index);
                const t = g.template || {};
                return (
                  <div key={g.goal_index} className="row" onClick={() => toggleG(g.goal_index)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 10px", borderRadius: 3, marginBottom: 4, background: done ? "#a855f711" : "transparent", border: `1px solid ${done ? "#a855f733" : "transparent"}`, cursor: "pointer", transition: "all 0.15s", userSelect: "none" }}>
                    <span style={{ fontSize: 13, color: done ? "#a855f7" : "#2a2a3e", flexShrink: 0, paddingTop: 1 }}>{done ? "◉" : "○"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12 }}>{CAT_ICON[t.category] || "▸"}</span>
                        <span style={{ fontSize: 13, color: done ? "#c0a0ff" : "#aaa", textDecoration: done ? "line-through" : "none" }}>{t.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#555" }}>{t.description}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: DIFF_COLOR[t.difficulty] || "#666" }}>{DIFF_LABEL[t.difficulty]}</div>
                      <div style={{ fontSize: 11, color: done ? "#a855f7" : "#2a2a3e" }}>+{t.xp_reward}xp</div>
                    </div>
                  </div>
                );
              })
        }
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={todayDone.size} max={Math.max(dailyGoals.length, 5)} color="#a855f7" />
        </div>
      </div>

      {/* Conquistas do nível */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2 }}>// CONQUISTAS DO NÍVEL ATUAL</div>
          <span style={{ fontSize: 11, color: "#444" }}>
            {ACHIEVEMENTS.filter(a => a.level === currentLevel.id && unlocked.has(a.id)).length}/{ACHIEVEMENTS.filter(a => a.level === currentLevel.id).length}
          </span>
        </div>
        {ACHIEVEMENTS.filter(a => a.level === currentLevel.id).map(a => (
          <div key={a.id} className="row" onClick={() => toggleA(a.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 3, marginBottom: 4, background: unlocked.has(a.id) ? `${currentLevel.color}11` : "transparent", border: `1px solid ${unlocked.has(a.id) ? currentLevel.color + "33" : "#1a1a2e"}`, cursor: "pointer", transition: "all 0.15s", userSelect: "none" }}>
            <span style={{ fontSize: 14, color: unlocked.has(a.id) ? currentLevel.color : "#2a2a3e" }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: unlocked.has(a.id) ? "#f0f0ff" : "#444" }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 1 }}>{a.desc}</div>
            </div>
            <span style={{ fontSize: 12, color: unlocked.has(a.id) ? currentLevel.color : "#2a2a3e" }}>+{a.xp}xp</span>
          </div>
        ))}
      </div>

      {/* Marcos */}
      <div style={{ gridColumn: "1/-1", background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 14 }}>// MARCOS ESPECIAIS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {MILESTONES.map(m => {
            const done = unlocked.has(m.trigger);
            return (
              <div key={m.id} style={{ textAlign: "center", padding: "12px 8px", background: done ? "#ffcc0011" : "#0a0a0f", border: `1px solid ${done ? "#ffcc0044" : "#1a1a2e"}`, borderRadius: 4, opacity: done ? 1 : 0.4, transition: "all 0.3s" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                <div style={{ fontSize: 12, color: done ? "#ffcc00" : "#333", fontWeight: 700, marginBottom: 3 }}>{m.title}</div>
                <div style={{ fontSize: 14, color: "#aaa", lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
