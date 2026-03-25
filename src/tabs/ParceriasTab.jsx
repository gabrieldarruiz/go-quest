import * as api from "../api.js";

export default function ParceriasTab({
  userID, mySaveBalance, friends, partnerships, setPartnerships,
  userSearch, setUserSearch, userResults, userSearchLoading, userSearchError,
  partnerError, setPartnerError, runUserSearch, loadSummary, loadFriends, loadPartnerships, showNotif,
}) {
  const copyMyID = async () => {
    if (!userID || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(userID);
      showNotif({ icon: "⎘", title: "ID copiado", desc: "Seu UUID foi para a area de transferencia." });
    } catch {}
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Saves */}
      <div style={{ background: "#0a0a0f", border: "1px solid #ffcc0033", borderRadius: 4, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#ffcc00", letterSpacing: 2, marginBottom: 10 }}>// SAVES DE STREAK</div>
        <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.7 }}>
          A cada 4 semanas consecutivas de streak pessoal, você ganha 1 save. Ele fica no seu inventário, pode acumular, ser usado na sua parceria ativa ou doado para um amigo.
        </div>
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10, background: "#111", border: "1px solid #2a2a3e", borderRadius: 4, padding: "8px 12px" }}>
          <span style={{ fontSize: 11, color: "#666" }}>saldo atual</span>
          <span style={{ fontSize: 15, color: "#ffcc00" }}>{mySaveBalance} save{mySaveBalance === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Onboarding */}
      {!localStorage.getItem("gq_partnerHelp_seen") && (
        <div style={{ background: "#0a0a0f", border: "1px solid #00cfff22", borderRadius: 4, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#00cfff", letterSpacing: 2 }}>// COMO FUNCIONAM AS PARCERIAS</div>
            <button onClick={() => localStorage.setItem("gq_partnerHelp_seen", "1")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>✕ fechar</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["📅 Check-in semanal","Você e seu parceiro fazem check-in uma vez por semana. Ambos devem fazer para o streak avançar."],["🔥 Streak de semanas","Cada semana que os dois fizeram check-in conta +1 no streak. Não percam o ritmo."],["💾 Saves","A cada 4 semanas de streak pessoal você ganha 1 save. Use para cobrir uma semana perdida sua ou do parceiro."],["🤝 Amizade automática","Ao aceitar uma parceria, vocês viram amigos automaticamente e podem se ver na aba de chat."]].map(([title, desc]) => (
              <div key={title} style={{ background: "#111", border: "1px solid #1a1a2e", borderRadius: 4, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, color: "#f0f0ff", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Busca */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 12 }}>// BUSCAR USUARIO POR USERNAME</div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Procure pelo username da pessoa e envie o convite de streak direto daqui. Se a parceria for aceita, voces viram amigos automaticamente.</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && runUserSearch()} placeholder="Buscar por username..." style={{ flex: 1, background: "#111", border: "1px solid #2a2a3e", borderRadius: 3, padding: "8px 10px", color: "#f0f0ff", fontSize: 12, outline: "none" }} />
          <button onClick={() => runUserSearch()} style={{ background: "#00cfff22", border: "1px solid #00cfff55", borderRadius: 3, color: "#00cfff", padding: "8px 16px", fontSize: 12, cursor: "pointer", minWidth: 90 }}>
            {userSearchLoading ? "..." : "Buscar"}
          </button>
        </div>
        {userSearchError && <div style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 10 }}>{userSearchError}</div>}
        {userResults.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {userResults.map((result) => {
              const canInvite = !result.partnership_status || result.partnership_status === "";
              const canAccept = result.partnership_status === "pending_received" && result.partnership_id;
              let actionLabel = "Convidar";
              if (result.partnership_status === "active") actionLabel = "Streak ativa";
              if (result.partnership_status === "pending_sent") actionLabel = "Convite enviado";
              if (result.partnership_status === "pending_received") actionLabel = "Aceitar";
              return (
                <div key={result.id} style={{ background: "#111", border: "1px solid #1f1f33", borderRadius: 4, padding: "10px 12px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#f0f0ff" }}>{result.username}</div>
                    <div style={{ fontSize: 11, color: result.is_friend ? "#a855f7" : "#666", marginTop: 2 }}>
                      {result.is_friend ? "ja e seu amigo" : "ainda nao e amigo"}
                      {result.partnership_status === "active" ? " · streak ativa" : ""}
                      {result.partnership_status === "pending_sent" ? " · aguardando aceite" : ""}
                      {result.partnership_status === "pending_received" ? " · te convidou para streak" : ""}
                    </div>
                  </div>
                  <button disabled={!canInvite && !canAccept} onClick={async () => {
                    setPartnerError("");
                    try {
                      if (canAccept && result.partnership_id) await api.respondPartnership(userID, result.partnership_id, true);
                      else if (canInvite) await api.createPartnership(userID, result.id);
                      await loadPartnerships(userID);
                      await loadFriends(userID);
                      await runUserSearch(userSearch);
                    } catch (e) { setPartnerError(e.message); }
                  }} style={{ background: canInvite || canAccept ? "#a855f722" : "transparent", border: `1px solid ${canInvite || canAccept ? "#a855f755" : "#2a2a3e"}`, borderRadius: 3, color: canInvite || canAccept ? "#c0a0ff" : "#555", padding: "8px 14px", fontSize: 11, cursor: canInvite || canAccept ? "pointer" : "not-allowed", minWidth: 120 }}>
                    {actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ID fallback */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 12 }}>// ID DE CONVITE (FALLBACK)</div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Se precisar, ainda da para compartilhar seu UUID manualmente.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, background: "#111", border: "1px solid #2a2a3e", borderRadius: 3, padding: "8px 10px", color: "#bbb", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{userID || "sem sessao"}</div>
          <button onClick={copyMyID} style={{ background: "transparent", border: "1px solid #2a2a3e", borderRadius: 3, color: "#888", padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>Copiar</button>
        </div>
      </div>

      {/* Amigos */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 12 }}>// AMIGOS</div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Todo aceite de parceria vira amizade automaticamente. Aqui voce ve sua rede, o saldo de saves de cada amigo e pode doar 1 save quando quiser.</div>
        {friends.length === 0
          ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>Nenhum amigo ainda.</div>
              <div style={{ fontSize: 12, color: "#444" }}>Busque alguém pelo username acima e envie um convite de streak. Todo aceite vira amizade automaticamente.</div>
            </div>
          )
          : (
            <div className="mobile-full" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {friends.map(f => (
                <div key={f.user_id} style={{ background: "#111", border: "1px solid #1f1f33", borderRadius: 4, padding: 12 }}>
                  <div style={{ fontSize: 13, color: "#f0f0ff", marginBottom: 4 }}>{f.username}</div>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>amigo desde {new Date(f.friends_since).toLocaleDateString("pt-BR")}</div>
                  <div style={{ fontSize: 11, color: f.has_active_partnership ? "#00ff88" : "#555", marginBottom: 8 }}>{f.has_active_partnership ? `streak ativa: ${f.partnership_streak_days} semanas` : "sem streak ativa agora"}</div>
                  <div style={{ fontSize: 11, color: "#ffcc00", marginBottom: 10 }}>saves guardados: {f.save_balance}</div>
                  <button disabled={mySaveBalance <= 0} onClick={async () => {
                    setPartnerError("");
                    try {
                      await api.donateSave(userID, f.user_id);
                      await loadSummary(userID); await loadFriends(userID); await loadPartnerships(userID);
                      showNotif({ icon: "🎁", title: "Save doado", desc: `1 save enviado para ${f.username}` });
                    } catch (e) { setPartnerError(e.message); }
                  }} style={{ background: mySaveBalance > 0 ? "#ffcc0022" : "transparent", border: `1px solid ${mySaveBalance > 0 ? "#ffcc0055" : "#2a2a3e"}`, borderRadius: 3, color: mySaveBalance > 0 ? "#ffcc00" : "#555", padding: "6px 12px", fontSize: 11, cursor: mySaveBalance > 0 ? "pointer" : "not-allowed" }}>
                    Doar 1 save
                  </button>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {partnerError && <div style={{ fontSize: 12, color: "#ff6b6b", margin: "0 0 16px" }}>{partnerError}</div>}

      {/* Parcerias */}
      {partnerships.length === 0
        ? (
          <div style={{ textAlign: "center", padding: "24px 0", border: "1px dashed #1a1a2e", borderRadius: 4 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>Nenhuma parceria ainda.</div>
            <div style={{ fontSize: 12, color: "#444" }}>Busque alguém acima para começar uma streak semanal juntos.</div>
          </div>
        )
        : partnerships.map(p => {
          const isPending = p.status === "pending";
          const isRequester = p.requester_id === userID;
          const partnerName = isRequester ? p.partner_name : p.requester_name;
          return (
            <div key={p.id} style={{ background: "#0a0a0f", border: `1px solid ${p.status === "active" ? "#00ff8833" : "#1a1a2e"}`, borderRadius: 4, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#f0f0ff", marginBottom: 3 }}><span style={{ color: "#555" }}>parceiro: </span>{partnerName}</div>
                  <div style={{ fontSize: 11, color: isPending ? "#ffcc00" : p.status === "active" ? "#00ff88" : "#ff6b6b" }}>
                    {isPending ? (isRequester ? "aguardando aceite" : "convite recebido") : p.status}
                  </div>
                </div>
                {p.status === "active" && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, color: "#ffcc00" }}>🔥 {p.streak_days}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>semanas juntos</div>
                  </div>
                )}
              </div>
              {p.status === "active" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, background: p.my_checkin_today ? "#00ff8811" : "#111", border: `1px solid ${p.my_checkin_today ? "#00ff8844" : "#2a2a3e"}`, borderRadius: 3, padding: "6px 10px", fontSize: 11, color: p.my_checkin_today ? "#00ff88" : "#555", textAlign: "center" }}>você nesta semana {p.my_checkin_today ? "✓" : "—"}</div>
                  <div style={{ flex: 1, background: p.partner_checkin_today ? "#00ff8811" : "#111", border: `1px solid ${p.partner_checkin_today ? "#00ff8844" : "#2a2a3e"}`, borderRadius: 3, padding: "6px 10px", fontSize: 11, color: p.partner_checkin_today ? "#00ff88" : "#555", textAlign: "center" }}>{partnerName} nesta semana {p.partner_checkin_today ? "✓" : "—"}</div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.status === "active" && !p.my_checkin_today && (
                  <button onClick={async () => {
                    try {
                      const updated = await api.partnershipCheckin(userID, p.id);
                      setPartnerships(prev => prev.map(x => x.id === p.id ? updated : x));
                      await loadSummary(userID);
                    } catch {}
                  }} style={{ background: "#00ff8822", border: "1px solid #00ff8855", borderRadius: 3, color: "#00ff88", padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>Check-in da semana</button>
                )}
                {p.status === "active" && (!p.my_checkin_today || !p.partner_checkin_today) && p.my_save_balance > 0 && (
                  <button onClick={async () => {
                    try {
                      const updated = await api.savePartner(userID, p.id);
                      setPartnerships(prev => prev.map(x => x.id === p.id ? updated : x));
                      await loadSummary(userID); await loadFriends(userID);
                    } catch (err) { setPartnerError(err.message || "Nao foi possivel usar um save."); }
                  }} style={{ background: "#ffcc0022", border: "1px solid #ffcc0055", borderRadius: 3, color: "#ffcc00", padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
                    {!p.my_checkin_today && p.partner_checkin_today ? `Usar 1 save em mim (${p.my_save_balance})` : p.my_checkin_today && !p.partner_checkin_today ? `Usar 1 save em ${partnerName} (${p.my_save_balance})` : `Fechar semana com 1 save (${p.my_save_balance})`}
                  </button>
                )}
                {isPending && !isRequester && (
                  <>
                    <button onClick={async () => {
                      try {
                        const updated = await api.respondPartnership(userID, p.id, true);
                        setPartnerships(prev => prev.map(x => x.id === p.id ? updated : x));
                        await loadFriends(userID);
                        if (userSearch.trim()) await runUserSearch(userSearch);
                      } catch {}
                    }} style={{ background: "#00ff8822", border: "1px solid #00ff8855", borderRadius: 3, color: "#00ff88", padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>Aceitar</button>
                    <button onClick={async () => {
                      try {
                        const updated = await api.respondPartnership(userID, p.id, false);
                        setPartnerships(prev => prev.map(x => x.id === p.id ? updated : x));
                        if (userSearch.trim()) await runUserSearch(userSearch);
                      } catch {}
                    }} style={{ background: "#ff6b3522", border: "1px solid #ff6b3555", borderRadius: 3, color: "#ff6b35", padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>Recusar</button>
                  </>
                )}
                <button onClick={async () => {
                  try {
                    await api.cancelPartnership(userID, p.id);
                    setPartnerships(prev => prev.filter(x => x.id !== p.id));
                    if (userSearch.trim()) await runUserSearch(userSearch);
                  } catch {}
                }} style={{ background: "transparent", border: "1px solid #2a2a3e", borderRadius: 3, color: "#555", padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}
