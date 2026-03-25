import { useState } from "react";

function AuthCard({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 80% 0%, #1f0f2d, #06060a 55%)", color: "#f0f0ff", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#0a0a0f", border: "1px solid #2a2a4e", borderRadius: 8, padding: 26 }}>
        <div style={{ fontSize: 12, color: "#ff2d7877", letterSpacing: 3, marginBottom: 10 }}>GO_QUEST AUTH</div>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 50, lineHeight: 1, marginBottom: 8, background: "linear-gradient(90deg, #ff2d78, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18, lineHeight: 1.7 }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 };

export function LandingPage({ hasSession }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 20% 10%, #241028, #06060a 50%)", color: "#f0f0ff", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 980, border: "1px solid #2a2a4e", borderRadius: 8, background: "linear-gradient(160deg, #0f0813, #06060a)", overflow: "hidden" }}>
        <div style={{ padding: "38px 32px", borderBottom: "1px solid #1a1a2e" }}>
          <div style={{ fontSize: 12, color: "#ff2d7877", letterSpacing: 4, marginBottom: 14 }}>GO_QUEST PLATFORM</div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: 72, lineHeight: 1, letterSpacing: 3, background: "linear-gradient(90deg, #ff2d78, #ff6b35, #ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GO_QUEST</div>
          <div style={{ marginTop: 8, fontSize: 16, color: "#c0a0ff", lineHeight: 1.6 }}>
            Plataforma gamificada para evoluir em Go com trilha, metas diárias, pomodoro e acompanhamento de progresso.
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="#/cadastro" style={{ textDecoration: "none", background: "#ff2d7811", border: "1px solid #ff2d7855", color: "#ff2d78", padding: "10px 18px", borderRadius: 4, fontSize: 13, letterSpacing: 1 }}>Criar conta</a>
            <a href="#/login" style={{ textDecoration: "none", background: "#a855f711", border: "1px solid #a855f755", color: "#a855f7", padding: "10px 18px", borderRadius: 4, fontSize: 13, letterSpacing: 1 }}>Fazer login</a>
            {hasSession && <a href="#/app" style={{ textDecoration: "none", background: "transparent", border: "1px solid #1f3a4e", color: "#00cfff", padding: "10px 18px", borderRadius: 4, fontSize: 13, letterSpacing: 1 }}>Abrir app</a>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: 20 }}>
          {[["10 níveis","Jornada estruturada de iniciante a especialista"],["+50 conquistas","Sistema de XP e marcos para manter consistência"],["Metas diárias","Ritmo de estudo com checklist objetivo"],["Pomodoro","Sessões de foco e pausa dentro da plataforma"]].map(([title, desc]) => (
            <div key={title} style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: "14px 12px" }}>
              <div style={{ fontSize: 13, color: "#f0f0ff", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ onSubmit, pending, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = (e) => { e.preventDefault(); if (!email.trim() || !password) return; onSubmit({ email: email.trim(), password }); };
  return (
    <AuthCard title="LOGIN" subtitle="Entre com email e senha para recuperar seu progresso.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" style={inputStyle} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" type="password" autoComplete="current-password" style={inputStyle} />
        <button type="submit" disabled={pending} style={{ background: "#a855f711", border: "1px solid #a855f755", color: "#a855f7", padding: "10px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 13, opacity: pending ? 0.7 : 1 }}>
          {pending ? "Entrando..." : "Entrar"}
        </button>
        {error && <div style={{ fontSize: 12, color: "#ff6b6b", lineHeight: 1.6 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <a href="#/cadastro" style={{ fontSize: 12, color: "#00cfff", textDecoration: "none" }}>Criar conta</a>
        <a href="#/forgot-password" style={{ fontSize: 12, color: "#ffcc00", textDecoration: "none" }}>Esqueci minha senha</a>
        <a href="#/" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>Voltar</a>
      </div>
    </AuthCard>
  );
}

export function SignupPage({ onSubmit, pending, error }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const submit = (e) => {
    e.preventDefault(); setLocalError("");
    if (!username.trim() || !email.trim() || !password || !confirmPassword) return;
    if (password.length < 6) { setLocalError("A senha precisa ter no minimo 6 caracteres."); return; }
    if (password !== confirmPassword) { setLocalError("As senhas nao conferem."); return; }
    onSubmit({ username: username.trim(), email: email.trim(), password });
  };
  return (
    <AuthCard title="CADASTRO" subtitle="Crie seu usuário para iniciar a trilha com progresso salvo.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" style={inputStyle} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Senha (min. 6 caracteres)" autoComplete="new-password" style={inputStyle} />
        <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Confirmar senha" autoComplete="new-password" style={inputStyle} />
        <button type="submit" disabled={pending} style={{ background: "#ff2d7811", border: "1px solid #ff2d7855", color: "#ff2d78", padding: "10px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 13, opacity: pending ? 0.7 : 1 }}>
          {pending ? "Criando..." : "Criar conta"}
        </button>
        {localError && <div style={{ fontSize: 12, color: "#ff6b6b", lineHeight: 1.6 }}>{localError}</div>}
        {error && <div style={{ fontSize: 12, color: "#ff6b6b", lineHeight: 1.6 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <a href="#/login" style={{ fontSize: 12, color: "#00cfff", textDecoration: "none" }}>Já tenho conta</a>
        <a href="#/" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>Voltar</a>
      </div>
    </AuthCard>
  );
}

export function ForgotPasswordPage({ onSubmit, pending, error, message }) {
  const [email, setEmail] = useState("");
  const submit = (e) => { e.preventDefault(); if (!email.trim()) return; onSubmit(email.trim()); };
  return (
    <AuthCard title="RECUPERAR SENHA" subtitle="Informe seu email para receber um link de redefinicao.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" style={inputStyle} />
        <button type="submit" disabled={pending} style={{ background: "#ffcc0011", border: "1px solid #ffcc0055", color: "#ffcc00", padding: "10px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 13, opacity: pending ? 0.7 : 1 }}>
          {pending ? "Enviando..." : "Enviar link"}
        </button>
        {message && <div style={{ fontSize: 12, color: "#00ff88", lineHeight: 1.6 }}>{message}</div>}
        {error && <div style={{ fontSize: 12, color: "#ff6b6b", lineHeight: 1.6 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 10 }}><a href="#/login" style={{ fontSize: 12, color: "#00cfff", textDecoration: "none" }}>Voltar ao login</a></div>
    </AuthCard>
  );
}

export function ResetPasswordPage({ token, onSubmit, pending, error, message }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const submit = (e) => {
    e.preventDefault(); setLocalError("");
    if (!token) { setLocalError("Token de redefinicao ausente no link."); return; }
    if (!password || !confirmPassword) return;
    if (password.length < 6) { setLocalError("A senha precisa ter no minimo 6 caracteres."); return; }
    if (password !== confirmPassword) { setLocalError("As senhas nao conferem."); return; }
    onSubmit({ token, password });
  };
  return (
    <AuthCard title="NOVA SENHA" subtitle="Defina uma nova senha para sua conta.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Nova senha" autoComplete="new-password" style={inputStyle} />
        <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Confirmar nova senha" autoComplete="new-password" style={inputStyle} />
        <button type="submit" disabled={pending || !token} style={{ background: "#ff2d7811", border: "1px solid #ff2d7855", color: "#ff2d78", padding: "10px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 13, opacity: (pending || !token) ? 0.7 : 1 }}>
          {pending ? "Atualizando..." : "Atualizar senha"}
        </button>
        {message && <div style={{ fontSize: 12, color: "#00ff88", lineHeight: 1.6 }}>{message}</div>}
        {localError && <div style={{ fontSize: 12, color: "#ff6b6b", lineHeight: 1.6 }}>{localError}</div>}
        {error && <div style={{ fontSize: 12, color: "#ff6b6b", lineHeight: 1.6 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <a href="#/login" style={{ fontSize: 12, color: "#00cfff", textDecoration: "none" }}>Voltar ao login</a>
        <a href="#/forgot-password" style={{ fontSize: 12, color: "#ffcc00", textDecoration: "none" }}>Pedir novo link</a>
      </div>
    </AuthCard>
  );
}

export function AuthRequiredPage() {
  return (
    <AuthCard title="ACESSO" subtitle="Faça login ou cadastre um usuário antes de entrar no app.">
      <div style={{ display: "flex", gap: 10 }}>
        <a href="#/login" style={{ textDecoration: "none", background: "#a855f711", border: "1px solid #a855f755", color: "#a855f7", padding: "10px 14px", borderRadius: 4, fontSize: 13 }}>Login</a>
        <a href="#/cadastro" style={{ textDecoration: "none", background: "#ff2d7811", border: "1px solid #ff2d7855", color: "#ff2d78", padding: "10px 14px", borderRadius: 4, fontSize: 13 }}>Cadastro</a>
      </div>
      <div style={{ marginTop: 10 }}><a href="#/" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>Voltar para apresentação</a></div>
    </AuthCard>
  );
}
