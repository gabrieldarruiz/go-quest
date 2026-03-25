export default function RankingTab({ leaderboard, lbLoading, lbSort, setLbSort, lbPeriod, setLbPeriod, onRefresh, weekLabel }) {
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        {[["weekly","Semanal"],["all","Geral"]].map(([period, label]) => (
          <button key={period} onClick={() => setLbPeriod(period)} style={{ background: lbPeriod === period ? "#ff2d7822" : "transparent", border: `1px solid ${lbPeriod === period ? "#ff2d7855" : "#2a2a3e"}`, borderRadius: 3, color: lbPeriod === period ? "#ff2d78" : "#555", padding: "6px 14px", fontSize: 11, cursor: "pointer" }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#666" }}>
          {lbPeriod === "weekly" ? `semana atual · ${weekLabel}` : "ranking geral"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["xp","XP Total"],["streak","Streak"],["level","Nível"]].map(([s, label]) => (
          <button key={s} onClick={() => setLbSort(s)} disabled={lbPeriod === "weekly"} style={{ background: lbSort === s && lbPeriod !== "weekly" ? "#00cfff22" : "transparent", border: `1px solid ${lbSort === s && lbPeriod !== "weekly" ? "#00cfff55" : "#2a2a3e"}`, borderRadius: 3, color: lbPeriod === "weekly" ? "#333" : lbSort === s ? "#00cfff" : "#555", padding: "6px 14px", fontSize: 11, cursor: lbPeriod === "weekly" ? "not-allowed" : "pointer", opacity: lbPeriod === "weekly" ? 0.5 : 1 }}>
            {label}
          </button>
        ))}
        <button onClick={onRefresh} style={{ background: "transparent", border: "1px solid #2a2a3e", borderRadius: 3, color: "#555", padding: "6px 14px", fontSize: 11, cursor: "pointer", marginLeft: "auto" }}>
          {lbLoading ? "..." : "↺ Atualizar"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#666", marginBottom: 16 }}>
        No ranking semanal, só conta o XP que continua válido. Se você marcar uma meta e depois desfizer, esse XP sai do ranking.
      </div>

      {lbLoading
        ? <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 24, textAlign: "center", fontSize: 13, color: "#666" }}>carregando ranking...</div>
        : leaderboard.length === 0
        ? (
          <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>{lbPeriod === "weekly" ? "Ninguém pontuou nesta semana ainda." : "Ranking ainda vazio."}</div>
            <div style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>Complete metas diárias para aparecer aqui.</div>
            <button onClick={onRefresh} style={{ background: "#00cfff22", border: "1px solid #00cfff55", borderRadius: 3, color: "#00cfff", padding: "8px 20px", fontSize: 12, cursor: "pointer" }}>Recarregar</button>
          </div>
        )
        : leaderboard.map((e, idx) => {
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${e.rank}`;
          const isMe = e.username === localStorage.getItem("goquest_username");
          return (
            <div key={e.rank} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 6, background: isMe ? "#00cfff08" : "#0a0a0f", border: `1px solid ${isMe ? "#00cfff33" : "#1a1a2e"}`, borderRadius: 4 }}>
              <div style={{ fontSize: idx < 3 ? 18 : 14, width: 32, textAlign: "center", color: "#666", flexShrink: 0 }}>{medal}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: isMe ? "#00cfff" : "#f0f0ff" }}>{e.username}{isMe ? " (você)" : ""}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>nível {e.current_level} · {e.achievements_unlocked} conquistas</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: lbPeriod === "weekly" ? "#00ff88" : "#ffcc00" }}>
                  {lbPeriod === "weekly" ? `${e.weekly_xp} XP na semana` : `${e.total_xp} XP`}
                </div>
                <div style={{ fontSize: 11, color: "#ff6b35" }}>🔥 {e.streak_days} semanas</div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}
