import * as api from "../api.js";
import { SKINS, ITEMS, DEFAULT_SKIN } from "../avatar/sprites.js";
import GopherAvatar from "../avatar/GopherAvatar.jsx";

const SLOT_LABEL = { hat: "CABEÇA", glasses: "ROSTO", outfit: "ROUPA" };

export default function GopherTab({ userID, avatar, setAvatar, ownedItems, showNotif }) {
  const equipped = avatar || { skin: DEFAULT_SKIN, hat: null, glasses: null, outfit: null };
  const owned = ownedItems || new Set();

  const persist = async (next) => {
    const prev = equipped;
    setAvatar(next);
    try {
      const saved = await api.updateAvatar(userID, next);
      if (saved?.equipped) setAvatar(saved.equipped);
    } catch (e) {
      setAvatar(prev);
      showNotif({ icon: "✕", title: "Não foi possível salvar", desc: e.message || "tente de novo" });
    }
  };

  const setSkin = (skinID) => { if (skinID !== equipped.skin) persist({ ...equipped, skin: skinID }); };
  const toggleItem = (item) => {
    if (!owned.has(item.id)) return;
    const isOn = equipped[item.slot] === item.id;
    persist({ ...equipped, [item.slot]: isOn ? null : item.id });
  };

  return (
    <div className="mobile-full" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16 }}>
      {/* Preview */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, alignSelf: "flex-start" }}>// SEU GOPHER</div>
        <div style={{ background: "linear-gradient(180deg, #14101f, #0d0a14)", border: "1px solid #2a2a4e", borderRadius: 4, padding: "18px 26px" }}>
          <GopherAvatar {...equipped} scale={7} />
        </div>
        <div style={{ fontSize: 12, color: "#666", letterSpacing: 1 }}>
          {SKINS[equipped.skin]?.name || "Aqua"} · {["hat", "glasses", "outfit"].filter(s => equipped[s]).length} item(ns) equipado(s)
        </div>
      </div>

      {/* Equipamento */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Skins */}
        <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 12 }}>// COR DO GOPHER</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(SKINS).map(([id, s]) => (
              <button key={id} onClick={() => setSkin(id)} title={s.name} style={{
                width: 44, height: 44, borderRadius: 4, cursor: "pointer",
                background: `linear-gradient(135deg, ${s.b} 55%, ${s.l} 55%)`,
                border: equipped.skin === id ? "2px solid #ff2d78" : "1px solid #2a2a3e",
                boxShadow: equipped.skin === id ? "0 0 10px #ff2d7855" : "none",
              }} />
            ))}
          </div>
        </div>

        {/* Slots */}
        {Object.entries(SLOT_LABEL).map(([slot, label]) => {
          const items = ITEMS.filter(i => i.slot === slot);
          return (
            <div key={slot} style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2 }}>// {label}</div>
                {equipped[slot] && (
                  <button onClick={() => persist({ ...equipped, [slot]: null })} style={{ background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>✕ remover</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {items.map(item => {
                  const isOwned = owned.has(item.id);
                  const isOn = equipped[item.slot] === item.id;
                  return (
                    <button key={item.id} onClick={() => toggleItem(item)} disabled={!isOwned} style={{
                      background: isOn ? "#ff2d7811" : "#111", borderRadius: 4, padding: 8, cursor: isOwned ? "pointer" : "not-allowed",
                      border: isOn ? "1px solid #ff2d7855" : "1px solid #1f1f33",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: isOwned ? 1 : 0.45,
                    }}>
                      <GopherAvatar skin={equipped.skin} {...{ [item.slot]: item.id }} scale={2} />
                      <div style={{ fontSize: 11, color: isOn ? "#ff2d78" : isOwned ? "#bbb" : "#555", fontFamily: "monospace" }}>
                        {isOwned ? item.name : `🔒 ${item.name}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ fontSize: 11, color: "#444", lineHeight: 1.7, padding: "0 4px" }}>
          Novas roupas e skins vão chegar na loja e como recompensa de metas, streaks e conquistas. Seu gopher, sua vibe.
        </div>
      </div>
    </div>
  );
}
