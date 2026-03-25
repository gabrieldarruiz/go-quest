import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "./api.js";

import { LEVELS, ACHIEVEMENTS, MILESTONES } from "./data/constants.js";
import { ProgressBar, Tag, AchCard } from "./components/ui.jsx";
import { LandingPage, LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage, AuthRequiredPage } from "./pages/AuthPages.jsx";
import HojeTab from "./tabs/HojeTab.jsx";
import TrilhaTab from "./tabs/TrilhaTab.jsx";
import ParceriasTab from "./tabs/ParceriasTab.jsx";
import RankingTab from "./tabs/RankingTab.jsx";
import { FerramentasTab, PraticasTab, ComunidadeTab } from "./tabs/RecursosTab.jsx";
import ChatTab from "./ChatTab.jsx";

// ─── Utilitários de roteamento ────────────────────────────────────────────────

function routeFromHash() {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash.replace(/^#/, "") || "/";
  return hash.split("?")[0] || "/";
}

function hashSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const idx = hash.indexOf("?");
  return idx === -1 ? new URLSearchParams() : new URLSearchParams(hash.slice(idx + 1));
}

// ─── MentorTab ────────────────────────────────────────────────────────────────

function MentorTab({ unlocked, totalXP, currentLevel, todayDone }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef(null);

  const unlockedNames = ACHIEVEMENTS.filter(a => unlocked.has(a.id)).map(a => a.title).join(", ") || "nenhuma ainda";
  const nextAchs = ACHIEVEMENTS.filter(a => !unlocked.has(a.id)).slice(0, 4).map(a => a.title).join(", ");
  const system = `Você é um mentor especialista em Go integrado ao GO_QUEST. Tom direto, técnico e motivador. Estado do aluno: Nível ${currentLevel.id} — ${currentLevel.title}, XP ${totalXP}, metas hoje ${todayDone.size}/5, conquistas: ${unlockedNames}. Próximas: ${nextAchs}. Responda em português, máx 4 parágrafos, foque em Go.`;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const ask = async (msgs) => { const d = await api.aiChat(msgs, system, 1024); return d.content || "Sem resposta."; };

  const start = async () => {
    setStarted(true); setLoading(true);
    try { setMessages([{ role: "assistant", content: await ask([{ role: "user", content: "Analisa meu progresso atual e me diz o que devo focar agora." }]) }]); }
    catch { setMessages([{ role: "assistant", content: "> ERRO: falha na conexão." }]); }
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    const next = [...messages, { role: "user", content: msg }];
    setMessages(next); setLoading(true);
    try { setMessages([...next, { role: "assistant", content: await ask(next) }]); }
    catch { setMessages([...next, { role: "assistant", content: "> ERRO na transmissão." }]); }
    setLoading(false);
  };

  if (!started) return (
    <div style={{ background: "#0a0a0f", border: "1px solid #ff2d7822", borderRadius: 4, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 700, background: "linear-gradient(90deg, #ff2d78, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MENTOR AI</div>
      <div style={{ fontSize: 13, color: "#bbb", letterSpacing: 1, textAlign: "center", lineHeight: 2 }}>Análise personalizada do seu progresso<br />e orientação focada no seu nível atual.</div>
      <button onClick={start} style={{ background: "#ff2d7811", border: "1px solid #ff2d7844", color: "#ff2d78", fontFamily: "monospace", fontSize: 14, padding: "10px 28px", borderRadius: 3, cursor: "pointer", letterSpacing: 1 }}>▶ INICIAR SESSÃO</button>
    </div>
  );

  return (
    <div style={{ background: "#0a0a0f", border: "1px solid #ff2d7822", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 12, color: "#ff2d7855", letterSpacing: 2, marginBottom: 12 }}>// GOPHER LEON (OPENAI) — MENTOR GO &gt;_</div>
      <div style={{ overflowY: "auto", maxHeight: 380, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%", background: m.role === "user" ? "#a855f711" : "#ff2d7808", border: `1px solid ${m.role === "user" ? "#a855f733" : "#ff2d7822"}`, borderRadius: 3, padding: "10px 14px" }}>
            {m.role === "assistant" && <div style={{ fontSize: 14, color: "#ff2d7844", letterSpacing: 1, marginBottom: 5 }}>GOPHER_LEON &gt;_</div>}
            <div style={{ fontSize: 13, color: m.role === "user" ? "#c0a0ff" : "#f0c0d0", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start", background: "#ff2d7808", border: "1px solid #ff2d7822", borderRadius: 3, padding: "10px 14px" }}><div style={{ fontSize: 13, color: "#ff2d7855" }}>compilando<span style={{ animation: "blink 1s step-end infinite" }}>▌</span></div></div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="dúvida sobre Go, revisão de conceito, o que estudar..." style={{ flex: 1, background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", fontFamily: "monospace", fontSize: 13, padding: "9px 12px", borderRadius: 3, outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ background: "#ff2d7811", border: "1px solid #ff2d7844", color: "#ff2d78", fontFamily: "monospace", fontSize: 12, padding: "9px 16px", borderRadius: 3, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>→</button>
      </div>
    </div>
  );
}

// ─── PomodoroTab ──────────────────────────────────────────────────────────────

function PomodoroTab({ userID, running, setRunning, seconds, setSeconds, isBreak, setIsBreak, sessions, setSessions }) {
  const WORK = 25 * 60, BREAK = 5 * 60;
  const ref = useRef(null);
  const reset = () => { clearInterval(ref.current); setRunning(false); setIsBreak(false); setSeconds(WORK); };

  useEffect(() => {
    if (!userID) return;
    api.getPomodoroToday(userID).then(d => setSessions(d.sessions_today)).catch(() => {});
  }, [userID]);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setSeconds(s => {
        if (s > 1) return s - 1;
        clearInterval(ref.current); setRunning(false);
        if (!isBreak) {
          setSessions(n => n + 1);
          if (userID) api.createPomodoro(userID, "work", 25).catch(() => {});
          setIsBreak(true); return BREAK;
        } else { setIsBreak(false); return WORK; }
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running, isBreak, userID, BREAK, WORK]);

  const total = isBreak ? BREAK : WORK;
  const pct = ((total - seconds) / total) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const R = 58, circ = 2 * Math.PI * R;
  const color = isBreak ? "#00cfff" : "#a855f7";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 24 }}>
        <div style={{ fontSize: 12, color: "#bbb", letterSpacing: 2, marginBottom: 16 }}>// {isBreak ? "PAUSA — RESPIRA" : "FOCO — MODO GO"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={70} cy={70} r={R} fill="none" stroke="#1a1a2e" strokeWidth={5} />
              <circle cx={70} cy={70} r={R} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 8px ${color})` }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ fontFamily: "monospace", fontSize: 32, color, fontWeight: 700 }}>{mm}:{ss}</div>
              <div style={{ fontSize: 14, color: "#bbb", letterSpacing: 2, marginTop: 2 }}>{isBreak ? "BREAK" : "WORK"}</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setRunning(r => !r)} style={{ background: running ? "#ff2d7822" : "#a855f722", border: `1px solid ${running ? "#ff2d7855" : "#a855f755"}`, color: running ? "#ff2d78" : "#a855f7", fontFamily: "monospace", fontSize: 13, padding: "8px 14px", borderRadius: 3, cursor: "pointer" }}>{running ? "⏸ PAUSAR" : "▶ INICIAR"}</button>
              <button onClick={reset} style={{ background: "transparent", border: "1px solid #1a1a2e", color: "#555", fontFamily: "monospace", fontSize: 13, padding: "8px 12px", borderRadius: 3, cursor: "pointer" }} title="Resetar timer">↺</button>
            </div>
            <div style={{ fontSize: 12, color: "#bbb", marginBottom: 8 }}>SESSÕES: <span style={{ color: "#a855f7", fontSize: 22, fontFamily: "monospace" }}>{sessions}</span></div>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              {[0,1,2,3].map(i => <div key={i} style={{ height: 6, flex: 1, borderRadius: 2, background: i < sessions % 4 ? "#a855f766" : "#1a1a2e", border: "1px solid #2a2a3e" }} />)}
            </div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{4 - (sessions % 4)} até pausa longa</div>
          </div>
        </div>
      </div>
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 20 }}>
        <div style={{ fontSize: 12, color: "#bbb", letterSpacing: 2, marginBottom: 14 }}>// COMO USAR</div>
        {[["25 min","Foco total — apenas Go"],["5 min","Pausa — sai da tela"],["4 sessões","Pausa longa (15–30min)"],["↺ reset","Volta o timer ao início"]].map(([t,d]) => (
          <div key={t} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <span style={{ fontFamily: "monospace", fontSize: 15, color: "#a855f7", flexShrink: 0, lineHeight: 1.4, minWidth: 60 }}>{t}</span>
            <span style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>{d}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, padding: "10px 12px", background: "#a855f708", border: "1px solid #a855f722", borderRadius: 3 }}>
          <div style={{ fontSize: 12, color: "#5a4a7a", lineHeight: 1.7 }}>💡 Uma tarefa por sessão. Sem Slack, sem Twitter. Só você e o Go.</div>
        </div>
      </div>
    </div>
  );
}

// ─── GoQuest (app principal) ──────────────────────────────────────────────────

export default function GoQuest() {
  const [route, setRoute] = useState(routeFromHash);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [userID, setUserID] = useState(null);
  const [summary, setSummary] = useState(null);
  const [totalXP, setTotalXP] = useState(0);
  const [unlocked, setUnlocked] = useState(new Set());
  const [dailyGoals, setDailyGoals] = useState([]);
  const [todayDone, setTodayDone] = useState(new Set());
  const [friends, setFriends] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbSort, setLbSort] = useState("xp");
  const [lbPeriod, setLbPeriod] = useState("weekly");
  const [lbLoading, setLbLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState("");
  const [partnerError, setPartnerError] = useState("");
  const [tab, setTab] = useState("hoje");
  const [time, setTime] = useState(new Date());
  const [pulse, setPulse] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pomRunning, setPomRunning] = useState(false);
  const [pomSeconds, setPomSeconds] = useState(25 * 60);
  const [pomIsBreak, setPomIsBreak] = useState(false);
  const [pomSessions, setPomSessions] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => { const h = () => setRoute(routeFromHash()); window.addEventListener("hashchange", h); return () => window.removeEventListener("hashchange", h); }, []);
  useEffect(() => { setAuthError(""); setAuthMessage(""); }, [route]);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setPulse(v => !v), 1500); return () => clearInterval(t); }, []);

  const currentLevel = [...LEVELS].reverse().find(l => totalXP >= l.xpMin) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.id === currentLevel.id + 1);
  const xpIn = totalXP - currentLevel.xpMin;
  const xpNeed = (nextLevel?.xpMin ?? currentLevel.xpMax) - currentLevel.xpMin;
  const currentStreak = summary?.streak_days || 0;
  const mySaveBalance = summary?.save_balance || 0;
  const pendingCheckin = partnerships.some(p => p.status === "active" && !p.my_checkin_today);

  const showNotif = useCallback((notif, ms = 2500) => { setNotification(notif); setTimeout(() => setNotification(null), ms); }, []);

  const loadSummary = useCallback(async (uid) => {
    const s = await api.getUser(uid);
    setSummary(s);
    if (typeof s.total_xp === "number") setTotalXP(s.total_xp);
    if (s.username) localStorage.setItem("goquest_username", s.username);
    return s;
  }, []);

  const loadLeaderboard = useCallback(async (sort = lbSort, period = lbPeriod) => {
    setLbLoading(true);
    try { const d = await api.getLeaderboard({ sort, period }); setLeaderboard(d.leaderboard || []); }
    finally { setLbLoading(false); }
  }, [lbPeriod, lbSort]);

  const loadFriends = useCallback(async (uid) => { const d = await api.getUserFriends(uid); setFriends(d || []); return d || []; }, []);
  const loadPartnerships = useCallback(async (uid) => { const d = await api.getUserPartnerships(uid); setPartnerships(d || []); return d || []; }, []);

  const runUserSearch = useCallback(async (query = userSearch) => {
    const term = query.trim();
    setUserSearchError("");
    if (!userID) return;
    if (term.length < 2) { setUserResults([]); setUserSearchError("Digite pelo menos 2 caracteres."); return; }
    setUserSearchLoading(true);
    try { const d = await api.searchUsers(term, userID); setUserResults(d || []); }
    catch (err) { setUserResults([]); setUserSearchError(err.message || "Nao foi possivel buscar usuarios."); }
    finally { setUserSearchLoading(false); }
  }, [userID, userSearch]);

  useEffect(() => {
    if (route !== "/app") return;
    async function init() {
      setLoading(true);
      const uid = localStorage.getItem("goquest_user_id");
      if (!uid) { setLoading(false); return; }
      setUserID(uid);
      try { await loadSummary(uid); } catch {}
      try { const a = await api.getUserAchievements(uid); setUnlocked(new Set((a || []).map(x => x.achievement_id))); } catch {}
      try { const d = await api.getDailyGoals(uid); const g = d.goals || []; setDailyGoals(g); setTodayDone(new Set(g.filter(x => x.completed).map(x => x.goal_index))); } catch {}
      try { await loadPartnerships(uid); } catch {}
      try { await loadFriends(uid); } catch {}
      setLoading(false);
    }
    init();
  }, [route, loadSummary, loadFriends, loadPartnerships]);

  useEffect(() => {
    if (route !== "/app" || tab !== "ranking" || !userID) return;
    loadLeaderboard(lbSort, lbPeriod);
  }, [route, tab, userID, lbSort, lbPeriod, loadLeaderboard]);

  const goTo = useCallback((r) => { window.location.hash = r; }, []);

  const handleSignup = useCallback(async ({ username, email, password }) => {
    setAuthError(""); setAuthLoading(true);
    try {
      const user = await api.register(username, email, password);
      if (!user?.id) throw new Error();
      localStorage.setItem("goquest_user_id", user.id);
      localStorage.setItem("goquest_username", user.username || username);
      setUserID(user.id); setSummary(null); setTotalXP(user.total_xp || 0);
      setUnlocked(new Set()); setTodayDone(new Set()); goTo("/app");
    } catch { setAuthError("Nao foi possivel criar a conta. Verifique os dados e tente novamente."); }
    finally { setAuthLoading(false); }
  }, [goTo]);

  const handleLogin = useCallback(async ({ email, password }) => {
    setAuthError(""); setAuthLoading(true);
    try {
      const s = await api.login(email, password);
      if (!s?.user_id) throw new Error();
      localStorage.setItem("goquest_user_id", s.user_id);
      if (s.username) localStorage.setItem("goquest_username", s.username);
      setUserID(s.user_id); setSummary(s);
      if (typeof s.total_xp === "number") setTotalXP(s.total_xp);
      goTo("/app");
    } catch { setAuthError("Email ou senha invalidos."); }
    finally { setAuthLoading(false); }
  }, [goTo]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("goquest_user_id"); localStorage.removeItem("goquest_username");
    setUserID(null); setSummary(null); setTotalXP(0); setUnlocked(new Set());
    setDailyGoals([]); setTodayDone(new Set()); setFriends([]); setPartnerships([]);
    setLeaderboard([]); setUserSearch(""); setUserResults([]); setUserSearchError("");
    goTo("/login");
  }, [goTo]);

  const handleForgotPassword = useCallback(async (email) => {
    setAuthError(""); setAuthLoading(true);
    try { await api.forgotPassword(email); setAuthMessage("Se o email existir, enviamos um link de recuperacao."); }
    catch { setAuthError("Nao foi possivel solicitar a recuperacao agora. Tente novamente."); }
    finally { setAuthLoading(false); }
  }, []);

  const handleResetPassword = useCallback(async ({ token, password }) => {
    setAuthError(""); setAuthLoading(true);
    try { await api.resetPassword(token, password); setAuthMessage("Senha atualizada com sucesso."); setTimeout(() => goTo("/login"), 1200); }
    catch { setAuthError("Link invalido ou expirado. Solicite um novo."); }
    finally { setAuthLoading(false); }
  }, [goTo]);

  const toggleA = useCallback(async (id) => {
    if (!userID) return;
    if (unlocked.has(id)) {
      setUnlocked(prev => { const n = new Set(prev); n.delete(id); return n; });
      try { await api.removeAchievement(userID, id); const a = ACHIEVEMENTS.find(x => x.id === id); if (a) showNotif({ icon: "↺", title: `${a.title} removida`, desc: `-${a.xp} XP` }); await loadSummary(userID); }
      catch { setUnlocked(prev => new Set([...prev, id])); }
      return;
    }
    try {
      await api.unlockAchievement(userID, id); setUnlocked(prev => new Set([...prev, id]));
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) { const ms = MILESTONES.find(m => m.trigger === id); if (ms) showNotif(ms, 3500); else showNotif({ icon: a.icon, title: a.title, desc: `+${a.xp} XP` }); }
      await loadSummary(userID);
    } catch {}
  }, [userID, unlocked, showNotif, loadSummary]);

  const toggleG = useCallback(async (i) => {
    if (!userID) return;
    const goal = dailyGoals[i];
    if (todayDone.has(i)) {
      setTodayDone(prev => { const n = new Set(prev); n.delete(i); return n; });
      try { await api.uncompleteGoal(userID, i); if (goal?.template?.xp_reward) setTotalXP(prev => Math.max(0, prev - goal.template.xp_reward)); await loadSummary(userID); }
      catch { setTodayDone(prev => new Set([...prev, i])); }
    } else {
      setTodayDone(prev => new Set([...prev, i]));
      try {
        await api.completeGoal(userID, i, goal?.template?.id, goal?.template?.xp_reward || 0);
        if (goal?.template?.xp_reward) { setTotalXP(prev => prev + goal.template.xp_reward); showNotif({ icon: "⚡", title: `+${goal.template.xp_reward} XP`, desc: goal.template.title }); }
        await loadSummary(userID);
      } catch { setTodayDone(prev => { const n = new Set(prev); n.delete(i); return n; }); }
    }
  }, [userID, todayDone, dailyGoals, loadSummary]);

  const timeStr = time.toTimeString().slice(0, 8);
  const dateStr = time.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
  const weekLabel = (() => {
    const now = new Date(), start = new Date(now);
    const diff = start.getDay() === 0 ? -6 : 1 - start.getDay();
    start.setDate(start.getDate() + diff); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const fmt = d => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
    return `${fmt(start)} - ${fmt(end)}`.toUpperCase();
  })();

  const primaryTabs = [["hoje","// HOJE"],["trilha","// TRILHA"],["timer","// POMODORO"],["parcerias","// PARCERIAS"],["ranking","// RANKING"],["chat", chatUnread > 0 ? `// CHAT (${chatUnread})` : "// CHAT"]];
  const secondaryTabs = [["ferramentas","// FERRAMENTAS"],["praticas","// BOAS PRÁTICAS"],["comunidade","// COMUNIDADE"],["mentor","// MENTOR AI"]];
  const resetToken = hashSearchParams().get("token") || "";

  if (route === "/") return <LandingPage hasSession={Boolean(localStorage.getItem("goquest_user_id"))} />;
  if (route === "/login") return <LoginPage onSubmit={handleLogin} pending={authLoading} error={authError} />;
  if (route === "/cadastro") return <SignupPage onSubmit={handleSignup} pending={authLoading} error={authError} />;
  if (route === "/forgot-password") return <ForgotPasswordPage onSubmit={handleForgotPassword} pending={authLoading} error={authError} message={authMessage} />;
  if (route === "/reset-password") return <ResetPasswordPage token={resetToken} onSubmit={handleResetPassword} pending={authLoading} error={authError} message={authMessage} />;
  if (route !== "/app") return <LandingPage hasSession={Boolean(localStorage.getItem("goquest_user_id"))} />;
  if (!loading && !userID) return <AuthRequiredPage />;

  return (
    <div style={{ minHeight: "100vh", background: "#06060a", fontFamily: "monospace", color: "#f0f0ff", fontSize: 14 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #ff2d7844; border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slidein { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeout { from { opacity:1; } to { opacity:0; } }
        .tbtn { background:none; border:none; cursor:pointer; font-size:13px; letter-spacing:1px; padding:10px 18px; transition:all 0.2s; color:#888; border-bottom:2px solid transparent; font-family:monospace; white-space:nowrap; }
        .tbtn:hover { color:#ff2d78 !important; }
        .tbtn.act { color:#ff2d78 !important; border-bottom:2px solid #ff2d78 !important; }
        .row:hover { background:#ffffff07 !important; }
        input::placeholder { color:#3a3a5e; }
        input:focus { border-color:#ff2d7844 !important; }
        .notif { animation: slidein 0.3s ease, fadeout 0.5s ease 2.5s forwards; }
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .mobile-full { grid-template-columns: 1fr !important; }
          .mobile-pad { padding: 16px !important; }
        }
      `}</style>

      {notification && (
        <div className="notif" style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: "#0a0a0f", border: `1px solid ${notification.title?.startsWith("+") ? "#00ff8844" : "#ff2d7844"}`, borderRadius: 4, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: `0 0 20px ${notification.title?.startsWith("+") ? "#00ff8833" : "#ff2d7833"}` }}>
          <span style={{ fontSize: 22 }}>{notification.icon}</span>
          <div>
            <div style={{ fontSize: 14, color: "#ff2d78", fontWeight: 700 }}>{notification.title}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{notification.desc}</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "100%", padding: "16px 20px" }} className="mobile-pad">
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#ff2d7877", letterSpacing: 4, marginBottom: 4 }}>GOPHER TERMINAL v3.0{loading && <span style={{ color: "#ffcc0088", marginLeft: 16 }}>SINCRONIZANDO▌</span>}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 60, lineHeight: 1, letterSpacing: 3, background: "linear-gradient(90deg, #ff2d78, #ff6b35, #ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 16px #ff2d7844)" }}>GO_QUEST</div>
              <div style={{ fontSize: 12, color: "#ff2d7855", letterSpacing: 3, marginTop: 3 }}>{'>'} DE ZERO AO ESPECIALISTA <span style={{ animation: "blink 1s step-end infinite", display: "inline-block" }}>█</span></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 30, letterSpacing: 3, background: "linear-gradient(90deg, #a855f7, #ff2d78)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{timeStr}</div>
              <div style={{ fontSize: 12, color: "#a855f755", letterSpacing: 2, marginTop: 1 }}>{dateStr}</div>
              {pomRunning && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: pomIsBreak ? "#00cfff15" : "#a855f715", border: `1px solid ${pomIsBreak ? "#00cfff44" : "#a855f744"}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", marginTop: 6 }} onClick={() => setTab("timer")}>
                  <span style={{ fontSize: 10 }}>{pomIsBreak ? "☕" : "⏱"}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 13, color: pomIsBreak ? "#00cfff" : "#a855f7" }}>{String(Math.floor(pomSeconds / 60)).padStart(2, "0")}:{String(pomSeconds % 60).padStart(2, "0")}</span>
                  <span style={{ fontSize: 10, color: "#555" }}>{pomIsBreak ? "BREAK" : "FOCUS"}</span>
                </div>
              )}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <a href="#/" style={{ fontSize: 12, color: "#00cfff", textDecoration: "none", border: "1px solid #00cfff33", borderRadius: 3, padding: "3px 8px" }}>inicio</a>
                <button onClick={handleLogout} style={{ fontSize: 12, color: "#ff6b6b", background: "transparent", border: "1px solid #ff6b6b33", borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontFamily: "monospace" }}>sair</button>
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg, #ff2d7855, #ff6b3533, transparent)", marginTop: 12 }} />
          <div style={{ height: 1, background: "linear-gradient(90deg, #a855f733, transparent)", marginTop: 2 }} />
        </div>

        {/* STATS */}
        <div className="mobile-full" style={{ background: "#0a0a0f", border: "1px solid #2a2a4e", borderRadius: 4, padding: "16px 20px", marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 24 }}>
          {[
            { label: "NÍVEL",      value: currentLevel.id,                        sub: currentLevel.title,                                                      color: currentLevel.color },
            { label: "XP TOTAL",   value: totalXP,                                sub: `${xpIn}/${xpNeed} próx.`,                                               color: "#00cfff" },
            { label: "STREAK",     value: currentStreak,                          sub: pendingCheckin ? "⚠ check-in pendente!" : currentStreak > 0 ? `${currentStreak} semanas seguidas` : "comece nesta semana", color: pendingCheckin ? "#ffcc00" : "#ff6b35" },
            { label: "SAVES",      value: mySaveBalance,                          sub: mySaveBalance > 0 ? "guardados no inventario" : "ganhe 1 a cada 4 semanas", color: "#ffcc00" },
            { label: "AMIGOS",     value: friends.length,                         sub: friends.length > 0 ? "rede ativa" : "sem conexões ainda",                 color: "#a855f7" },
            { label: "CONQUISTAS", value: `${unlocked.size}/${ACHIEVEMENTS.length}`, sub: `${Math.round(unlocked.size / ACHIEVEMENTS.length * 100)}% completo`, color: "#ff2d78" },
            { label: "MARCOS",     value: MILESTONES.filter(m => unlocked.has(m.trigger)).length, sub: `de ${MILESTONES.length} especiais`,                      color: "#ffcc00" },
            { label: "HOJE",       value: `${todayDone.size}/5`,                  sub: todayDone.size === 5 ? "🔥 dia perfeito!" : "metas do dia",               color: "#00ff88" },
          ].map(({ label, value, sub, color }) => (
            <div key={label}>
              <div style={{ fontSize: 13, color: "#aaa", letterSpacing: 2, marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 30, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* XP BAR */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#aaa", marginBottom: 5, letterSpacing: 1 }}>
            <span>LVL {currentLevel.id} → {nextLevel ? `LVL ${nextLevel.id} — ${nextLevel.title}` : "ESPECIALISTA"}</span>
            <span style={{ color: "#bbb" }}>{xpIn} / {xpNeed} XP</span>
          </div>
          <ProgressBar value={xpIn} max={xpNeed} color={currentLevel.color} />
        </div>

        {/* TABS */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #1a1a2e", overflowX: "auto" }}>
            {primaryTabs.map(([id, label]) => (
              <button key={id} className={`tbtn${tab === id ? " act" : ""}`} onClick={() => { setTab(id); if (id === "chat") setChatUnread(0); }}>{label}</button>
            ))}
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button className={`tbtn${secondaryTabs.some(([id]) => id === tab) ? " act" : ""}`} onClick={() => setShowSecondary(v => !v)}>
                // MAIS {secondaryTabs.some(([id]) => id === tab) ? "▲" : "▼"}
              </button>
              {showSecondary && (
                <div style={{ position: "absolute", right: 0, top: "100%", background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, zIndex: 50, minWidth: 180 }}>
                  {secondaryTabs.map(([id, label]) => (
                    <button key={id} onClick={() => { setTab(id); setShowSecondary(false); }} style={{ display: "block", width: "100%", background: tab === id ? "#ff2d7811" : "none", border: "none", borderBottom: "1px solid #1a1a2e", color: tab === id ? "#ff2d78" : "#888", fontFamily: "monospace", fontSize: 13, padding: "10px 16px", cursor: "pointer", textAlign: "left", letterSpacing: 1 }}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        {tab === "hoje" && <HojeTab dailyGoals={dailyGoals} todayDone={todayDone} loading={loading} toggleG={toggleG} toggleA={toggleA} unlocked={unlocked} currentLevel={currentLevel} />}
        {tab === "trilha" && <TrilhaTab unlocked={unlocked} toggleA={toggleA} currentLevel={currentLevel} />}
        {tab === "timer" && <PomodoroTab userID={userID} running={pomRunning} setRunning={setPomRunning} seconds={pomSeconds} setSeconds={setPomSeconds} isBreak={pomIsBreak} setIsBreak={setPomIsBreak} sessions={pomSessions} setSessions={setPomSessions} />}
        {tab === "parcerias" && (
          <ParceriasTab
            userID={userID} mySaveBalance={mySaveBalance} friends={friends} partnerships={partnerships}
            setPartnerships={setPartnerships} userSearch={userSearch} setUserSearch={setUserSearch}
            userResults={userResults} userSearchLoading={userSearchLoading} userSearchError={userSearchError}
            partnerError={partnerError} setPartnerError={setPartnerError} runUserSearch={runUserSearch}
            loadSummary={loadSummary} loadFriends={loadFriends} loadPartnerships={loadPartnerships} showNotif={showNotif}
          />
        )}
        {tab === "ranking" && <RankingTab leaderboard={leaderboard} lbLoading={lbLoading} lbSort={lbSort} setLbSort={setLbSort} lbPeriod={lbPeriod} setLbPeriod={setLbPeriod} onRefresh={() => loadLeaderboard(lbSort, lbPeriod)} weekLabel={weekLabel} />}
        {tab === "ferramentas" && <FerramentasTab currentLevel={currentLevel} />}
        {tab === "praticas" && <PraticasTab />}
        {tab === "comunidade" && <ComunidadeTab />}
        {tab === "mentor" && <MentorTab unlocked={unlocked} totalXP={totalXP} currentLevel={currentLevel} todayDone={todayDone} />}
        {tab === "chat" && (
          <div style={{ height: 560 }}>
            <ChatTab user={{ id: userID, username: localStorage.getItem("goquest_username") }} onUnreadChange={setChatUnread} />
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", fontSize: 14, color: "#2a2a4e", letterSpacing: 1, borderTop: "1px solid #1a1a2e", paddingTop: 12 }}>
          <span>GO_QUEST v3 // DE ZERO AO ESPECIALISTA</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: pulse ? "#ff2d7844" : "#1a1a2e", transition: "color 0.4s" }}>●</span> SISTEMA ATIVO
          </span>
        </div>
      </div>
    </div>
  );
}
