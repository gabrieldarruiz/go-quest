import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "./api.js";

// ─── DATA ───────────────────────────────────────────────────────────────────

const LEVELS = [
  { id: 1, title: "Absolute Zero",    subtitle: "Ambiente configurado",         color: "#555",    xpMin: 0,    xpMax: 200  },
  { id: 2, title: "Iniciante",        subtitle: "Sintaxe e fundamentos",        color: "#00cfff", xpMin: 200,  xpMax: 500  },
  { id: 3, title: "Construtor",       subtitle: "Tipos, structs, interfaces",   color: "#00ff88", xpMin: 500,  xpMax: 900  },
  { id: 4, title: "Desenvolvedor",    subtitle: "Testes, erros, CLI",           color: "#a855f7", xpMin: 900,  xpMax: 1400 },
  { id: 5, title: "Praticante",       subtitle: "HTTP, JSON, banco de dados",   color: "#ff6b35", xpMin: 1400, xpMax: 2100 },
  { id: 6, title: "Engenheiro",       subtitle: "Concorrência real",            color: "#ffcc00", xpMin: 2100, xpMax: 3000 },
  { id: 7, title: "Arquiteto",        subtitle: "Patterns e clean arch",        color: "#ff2d78", xpMin: 3000, xpMax: 4200 },
  { id: 8, title: "Sênior",           subtitle: "Performance e observabilidade",color: "#00cfff", xpMin: 4200, xpMax: 5700 },
  { id: 9, title: "Staff",            subtitle: "Sistemas distribuídos",        color: "#a855f7", xpMin: 5700, xpMax: 7500 },
  { id: 10, title: "Especialista",    subtitle: "Referência técnica",           color: "#ff2d78", xpMin: 7500, xpMax: 9999 },
];

const ACHIEVEMENTS = [
  // LVL 1 — Absolute Zero
  { id: "env_setup",      level: 1, icon: "◈", title: "Ambiente Pronto",       desc: "Go instalado, GOPATH configurado, VSCode/Neovim com extensão Go", xp: 30 },
  { id: "hello_world",    level: 1, icon: "◉", title: "Hello, Gopher",         desc: "Rodou seu primeiro programa Go no terminal", xp: 20 },
  { id: "go_tour",        level: 1, icon: "⬡", title: "Tour Completo",         desc: "Completou o tour.golang.org inteiro", xp: 80 },
  { id: "first_module",   level: 1, icon: "▣", title: "Módulo Criado",         desc: "Criou um módulo com go mod init e entendeu o go.mod", xp: 50 },
  { id: "read_docs",      level: 1, icon: "◎", title: "Leitor de Docs",        desc: "Leu a documentação oficial em pkg.go.dev", xp: 20 },

  // LVL 2 — Iniciante
  { id: "variables",      level: 2, icon: "⟁", title: "Declarações",           desc: "Dominou var, :=, const e os tipos básicos", xp: 40 },
  { id: "control_flow",   level: 2, icon: "⇌", title: "Fluxo Controlado",      desc: "Usou if, for, switch e defer", xp: 50 },
  { id: "functions",      level: 2, icon: "⚠", title: "Funcional",             desc: "Criou funções com múltiplos retornos e variádicas", xp: 60 },
  { id: "slices_maps",    level: 2, icon: "✦", title: "Coleções",              desc: "Dominou slices, arrays e maps na prática", xp: 70 },
  { id: "pointers",       level: 2, icon: "⊕", title: "Ponteiros",             desc: "Entendeu ponteiros e quando usá-los em Go", xp: 80 },

  // LVL 3 — Construtor
  { id: "structs",        level: 3, icon: "◬", title: "Arquiteto de Structs",  desc: "Criou structs com métodos e entendeu embedding", xp: 80 },
  { id: "interfaces",     level: 3, icon: "▤", title: "Contratualista",        desc: "Implementou interfaces e entendeu duck typing", xp: 100 },
  { id: "packages",       level: 3, icon: "◈", title: "Empacotador",           desc: "Criou pacotes reutilizáveis e entendeu exported/unexported", xp: 70 },
  { id: "error_type",     level: 3, icon: "◉", title: "Errors são Valores",    desc: "Criou tipos de erro customizados com errors.New e fmt.Errorf", xp: 90 },
  { id: "stringer",       level: 3, icon: "⬡", title: "Stringer",              desc: "Implementou a interface fmt.Stringer nos seus tipos", xp: 60 },

  // LVL 4 — Desenvolvedor
  { id: "testing",        level: 4, icon: "▣", title: "Testador",              desc: "Escreveu testes com go test, subtests e table-driven tests", xp: 100 },
  { id: "benchmarks",     level: 4, icon: "◎", title: "Benchmark",             desc: "Criou benchmarks com testing.B e analisou resultados", xp: 80 },
  { id: "cobra_cli",      level: 4, icon: "⟁", title: "CLI Gopher",            desc: "Construiu uma CLI com cobra ou flag package", xp: 110 },
  { id: "govet_lint",     level: 4, icon: "⇌", title: "Código Limpo",          desc: "Usou go vet, golangci-lint e corrigiu todos os warnings", xp: 70 },
  { id: "go_generate",    level: 4, icon: "⚠", title: "Gerador",               desc: "Usou go generate para automatizar código", xp: 60 },

  // LVL 5 — Praticante
  { id: "http_server",    level: 5, icon: "✦", title: "Servidor Online",       desc: "Criou um servidor HTTP com net/http ou Gin/Chi", xp: 100 },
  { id: "json_api",       level: 5, icon: "⊕", title: "API Builder",           desc: "Construiu uma REST API com encoding/json completa", xp: 120 },
  { id: "database",       level: 5, icon: "◬", title: "Persistência",          desc: "Integrou banco de dados com database/sql ou GORM", xp: 130 },
  { id: "middleware",     level: 5, icon: "▤", title: "Middleware",             desc: "Implementou middleware de auth, logging e CORS", xp: 90 },
  { id: "sqlc_migrate",   level: 5, icon: "◈", title: "Migrations",            desc: "Usou sqlc ou golang-migrate para gerenciar schema", xp: 110 },

  // LVL 6 — Engenheiro
  { id: "goroutines",     level: 6, icon: "◉", title: "Concorrente",           desc: "Lançou goroutines e entendeu o modelo de concorrência Go", xp: 120 },
  { id: "channels",       level: 6, icon: "⬡", title: "Mensageiro",            desc: "Usou channels para comunicação entre goroutines", xp: 130 },
  { id: "select",         level: 6, icon: "▣", title: "Seletor",               desc: "Usou select para multiplexar channels com timeout", xp: 110 },
  { id: "sync_pkg",       level: 6, icon: "◎", title: "Sincronizador",         desc: "Usou sync.Mutex, sync.WaitGroup e sync.Once corretamente", xp: 140 },
  { id: "race_detector",  level: 6, icon: "⟁", title: "Race Free",             desc: "Rodou go test -race e eliminou todas as race conditions", xp: 150 },
  { id: "worker_pool",    level: 6, icon: "⇌", title: "Worker Pool",           desc: "Implementou um worker pool funcional com goroutines", xp: 150 },

  // LVL 7 — Arquiteto
  { id: "clean_arch",     level: 7, icon: "⚠", title: "Clean Architecture",    desc: "Organizou um projeto com camadas domain/usecase/infra", xp: 180 },
  { id: "di_pattern",     level: 7, icon: "✦", title: "Injeção de Dependência",desc: "Implementou DI manual ou com wire/dig", xp: 150 },
  { id: "repo_pattern",   level: 7, icon: "⊕", title: "Repository Pattern",    desc: "Separou lógica de acesso a dados em repositórios", xp: 130 },
  { id: "solid_go",       level: 7, icon: "◬", title: "SOLID em Go",           desc: "Aplicou princípios SOLID de forma idiomática em Go", xp: 160 },
  { id: "idiomatic",      level: 7, icon: "▤", title: "Gopher Idiomático",     desc: "Revisou código seguindo Effective Go e Go Proverbs", xp: 140 },

  // LVL 8 — Sênior
  { id: "profiling",      level: 8, icon: "◈", title: "Profiler",              desc: "Usou pprof para identificar e corrigir gargalos de CPU/memória", xp: 200 },
  { id: "tracing",        level: 8, icon: "◉", title: "Tracing",               desc: "Implementou distributed tracing com OpenTelemetry", xp: 190 },
  { id: "metrics",        level: 8, icon: "⬡", title: "Métricas",              desc: "Expôs métricas com Prometheus e criou dashboards Grafana", xp: 180 },
  { id: "memory_opt",     level: 8, icon: "▣", title: "Memory Master",         desc: "Otimizou alocações, entendeu GC e reduziu heap pressure", xp: 210 },
  { id: "air_hot",        level: 8, icon: "◎", title: "Dev Experience",        desc: "Configurou air para hot reload e ambiente de dev produtivo", xp: 120 },

  // LVL 9 — Staff
  { id: "grpc",           level: 9, icon: "⟁", title: "gRPC Master",           desc: "Construiu um serviço gRPC com protobuf e streaming", xp: 250 },
  { id: "microservices",  level: 9, icon: "⇌", title: "Microsserviços",        desc: "Decompôs um monolito em serviços comunicantes", xp: 280 },
  { id: "message_queue",  level: 9, icon: "⚠", title: "Mensageria",            desc: "Integrou RabbitMQ ou Kafka em um serviço Go", xp: 240 },
  { id: "distributed",    level: 9, icon: "✦", title: "Sistemas Distribuídos", desc: "Implementou circuit breaker, retry e graceful shutdown", xp: 260 },
  { id: "docker_k8s",     level: 9, icon: "⊕", title: "Cloud Native",          desc: "Containerizou e deployou serviços Go no Kubernetes", xp: 220 },

  // LVL 10 — Especialista
  { id: "oss_contrib",    level: 10, icon: "◬", title: "Open Source",          desc: "Teve um PR aceito em um projeto Go relevante", xp: 400 },
  { id: "own_lib",        level: 10, icon: "▤", title: "Autor de Biblioteca",  desc: "Publicou uma biblioteca Go usada por outras pessoas", xp: 350 },
  { id: "tech_talk",      level: 10, icon: "◈", title: "Palestrante",          desc: "Apresentou sobre Go em meetup, conf ou artigo técnico", xp: 300 },
  { id: "read_stdlib",    level: 10, icon: "◉", title: "Leitor de Stdlib",     desc: "Leu e entendeu o código-fonte de pacotes da stdlib", xp: 250 },
  { id: "mentor",         level: 10, icon: "⬡", title: "Mentor",               desc: "Ajudou outros devs a aprenderem Go ativamente", xp: 200 },
];

const MILESTONES = [
  { id: "first_run",    icon: "🚀", title: "Primeiro Run",        desc: "Rodou go run pela primeira vez", trigger: "hello_world" },
  { id: "first_test",   icon: "✅", title: "Primeiro Teste Verde", desc: "go test passou pela primeira vez", trigger: "testing" },
  { id: "first_api",    icon: "🌐", title: "Primeira API",         desc: "Sua primeira rota HTTP respondendo", trigger: "http_server" },
  { id: "first_deploy", icon: "🎯", title: "Primeiro Deploy",      desc: "Código Go rodando em produção", trigger: "docker_k8s" },
  { id: "first_pr",     icon: "🤝", title: "Primeiro PR Open Source", desc: "Contribuição aceita", trigger: "oss_contrib" },
];

const TOOLS = [
  { level: 1,  name: "gopls",          desc: "Language server oficial do Go", url: "https://pkg.go.dev/golang.org/x/tools/gopls" },
  { level: 2,  name: "go fmt",         desc: "Formatação automática de código", url: "https://pkg.go.dev/cmd/gofmt" },
  { level: 3,  name: "go doc",         desc: "Documentação inline no terminal", url: "https://pkg.go.dev/cmd/go#hdr-Show_documentation_for_package_or_symbol" },
  { level: 4,  name: "golangci-lint",  desc: "Linter com dezenas de regras", url: "https://golangci-lint.run" },
  { level: 4,  name: "cobra",          desc: "Framework para CLIs poderosas", url: "https://github.com/spf13/cobra" },
  { level: 5,  name: "sqlc",           desc: "Gera código Go a partir de SQL", url: "https://sqlc.dev" },
  { level: 5,  name: "golang-migrate", desc: "Migrations de banco de dados", url: "https://github.com/golang-migrate/migrate" },
  { level: 6,  name: "race detector",  desc: "go test -race detecta race conditions", url: "https://go.dev/doc/articles/race_detector" },
  { level: 7,  name: "wire",           desc: "Injeção de dependência em compile-time", url: "https://github.com/google/wire" },
  { level: 8,  name: "pprof",          desc: "Profiling de CPU e memória", url: "https://pkg.go.dev/net/http/pprof" },
  { level: 8,  name: "air",            desc: "Hot reload para desenvolvimento", url: "https://github.com/cosmtrek/air" },
  { level: 9,  name: "protobuf/grpc",  desc: "Serialização e RPC eficientes", url: "https://grpc.io/docs/languages/go" },
  { level: 9,  name: "OpenTelemetry",  desc: "Observabilidade padronizada", url: "https://opentelemetry.io/docs/languages/go" },
];

const COMMUNITY = [
  { name: "Gophers Brasil",      url: "https://gophers.com.br",                  desc: "Comunidade brasileira de Go" },
  { name: "Gophers Slack",       url: "https://gophers.slack.com",               desc: "Slack global com 50k+ membros" },
  { name: "r/golang",            url: "https://reddit.com/r/golang",             desc: "Subreddit ativo" },
  { name: "GopherCon Brasil",    url: "https://gopherconbr.org",                 desc: "Conferência nacional de Go" },
  { name: "Go Time Podcast",     url: "https://changelog.com/gotime",            desc: "Podcast semanal sobre Go" },
  { name: "pkg.go.dev",          url: "https://pkg.go.dev",                      desc: "Documentação oficial de todos os pacotes" },
];

const PRACTICES = [
  { id: "p1", title: "Accept interfaces, return structs",    desc: "Suas funções devem aceitar interfaces e retornar tipos concretos" },
  { id: "p2", title: "Errors são valores",                   desc: "Trate erros como valores, não exceções. Nunca ignore um erro" },
  { id: "p3", title: "Don't communicate by sharing memory",  desc: "Use channels para compartilhar dados entre goroutines" },
  { id: "p4", title: "The bigger the interface, the weaker", desc: "Interfaces pequenas são mais poderosas. Prefira 1-2 métodos" },
  { id: "p5", title: "gofmt é lei",                          desc: "Sempre formate seu código. Sem discussão de estilo" },
  { id: "p6", title: "Nomes curtos para escopos curtos",     desc: "i, v, err para variáveis locais. Nomes longos para exports" },
  { id: "p7", title: "Trate context com respeito",           desc: "Sempre passe context.Context como primeiro argumento" },
  { id: "p8", title: "Zero values devem ser úteis",          desc: "Projete seus tipos para que o zero value faça sentido" },
  { id: "p9", title: "Evite init()",                         desc: "init() dificulta testes e rastreamento de fluxo" },
  { id: "p10", title: "Table-driven tests",                  desc: "Teste com tabelas de casos — é o padrão idiomático do Go" },
];

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = "#a855f7", height = 8 }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ background: "#111", border: "1px solid #1a1a2e", height, borderRadius: 2, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}66`, transition: "width 0.8s ease", borderRadius: 2 }} />
    </div>
  );
}

function Tag({ color, children }) {
  return <span style={{ fontSize: 14, color, border: `1px solid ${color}44`, padding: "1px 6px", borderRadius: 2, letterSpacing: 1 }}>{children}</span>;
}

function AchCard({ ach, done, onToggle, levelColor }) {
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

function MentorTab({ unlocked, totalXP, currentLevel, todayDone }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef(null);

  const unlockedNames = ACHIEVEMENTS.filter(a => unlocked.has(a.id)).map(a => a.title).join(", ") || "nenhuma ainda";
  const nextAchs = ACHIEVEMENTS.filter(a => !unlocked.has(a.id)).slice(0, 4).map(a => a.title).join(", ");

  const system = `Você é um mentor especialista em Go (Golang) integrado ao GO_QUEST, um tracker de aprendizado gamificado com 10 níveis do zero ao especialista. Tom direto, técnico e motivador — como um dev sênior Go que quer ver o aluno crescer. Use terminologia de terminal às vezes.

Estado atual do aluno:
- Nível atual: ${currentLevel.id} — ${currentLevel.title} (${currentLevel.subtitle})
- XP Total: ${totalXP}
- Metas concluídas hoje: ${todayDone.size}/5
- Conquistas desbloqueadas: ${unlockedNames}
- Próximas conquistas sugeridas: ${nextAchs}

Responda sempre em português. Seja conciso (máx 4 parágrafos). Foque em Go. Dê exemplos de código quando relevante. Sugira recursos específicos (livros, links, exercícios) quando apropriado.`;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const ask = async (msgs) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system, messages: msgs }),
    });
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "Sem resposta.";
  };

  const start = async () => {
    setStarted(true); setLoading(true);
    try {
      const text = await ask([{ role: "user", content: "Analisa meu progresso atual e me diz exatamente o que devo focar agora para avançar no aprendizado de Go." }]);
      setMessages([{ role: "assistant", content: text }]);
    } catch { setMessages([{ role: "assistant", content: "> ERRO: falha na conexão." }]); }
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    const next = [...messages, { role: "user", content: msg }];
    setMessages(next); setLoading(true);
    try {
      const text = await ask(next);
      setMessages([...next, { role: "assistant", content: text }]);
    } catch { setMessages([...next, { role: "assistant", content: "> ERRO na transmissão." }]); }
    setLoading(false);
  };

  if (!started) return (
    <div style={{ background: "#0a0a0f", border: "1px solid #ff2d7822", borderRadius: 4, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 700, background: "linear-gradient(90deg, #ff2d78, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MENTOR AI</div>
      <div style={{ fontSize: 13, color: "#bbb", letterSpacing: 1, textAlign: "center", lineHeight: 2 }}>
        Análise personalizada do seu progresso<br />e orientação focada no seu nível atual.
      </div>
      <button onClick={start} style={{ background: "#ff2d7811", border: "1px solid #ff2d7844", color: "#ff2d78", fontFamily: "monospace", fontSize: 14, padding: "10px 28px", borderRadius: 3, cursor: "pointer", letterSpacing: 1 }}>▶ INICIAR SESSÃO</button>
    </div>
  );

  return (
    <div style={{ background: "#0a0a0f", border: "1px solid #ff2d7822", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 12, color: "#ff2d7855", letterSpacing: 2, marginBottom: 12 }}>// CLAUDE — MENTOR GO &gt;_</div>
      <div style={{ overflowY: "auto", maxHeight: 380, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%", background: m.role === "user" ? "#a855f711" : "#ff2d7808", border: `1px solid ${m.role === "user" ? "#a855f733" : "#ff2d7822"}`, borderRadius: 3, padding: "10px 14px" }}>
            {m.role === "assistant" && <div style={{ fontSize: 14, color: "#ff2d7844", letterSpacing: 1, marginBottom: 5 }}>CLAUDE &gt;_</div>}
            <div style={{ fontSize: 13, color: m.role === "user" ? "#c0a0ff" : "#f0c0d0", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: "#ff2d7808", border: "1px solid #ff2d7822", borderRadius: 3, padding: "10px 14px" }}>
            <div style={{ fontSize: 13, color: "#ff2d7855" }}>compilando<span style={{ animation: "blink 1s step-end infinite" }}>▌</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="dúvida sobre Go, revisão de conceito, o que estudar..."
          style={{ flex: 1, background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", fontFamily: "monospace", fontSize: 13, padding: "9px 12px", borderRadius: 3, outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ background: "#ff2d7811", border: "1px solid #ff2d7844", color: "#ff2d78", fontFamily: "monospace", fontSize: 12, padding: "9px 16px", borderRadius: 3, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>→</button>
      </div>
    </div>
  );
}

// ─── POMODORO ────────────────────────────────────────────────────────────────

function PomodoroTab({ userID }) {
  const WORK = 25 * 60, BREAK = 5 * 60;
  const [seconds, setSeconds] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const ref = useRef(null);
  const sessionStartRef = useRef(null);

  const reset = () => { clearInterval(ref.current); setRunning(false); setIsBreak(false); setSeconds(WORK); };

  // load today's count from backend
  useEffect(() => {
    if (!userID) return;
    api.getPomodoroToday(userID).then(d => setSessions(d.sessions_today)).catch(() => {});
  }, [userID]);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(ref.current);
            setRunning(false);
            if (!isBreak) {
              const type = "work";
              setSessions(n => n + 1);
              if (userID) {
                api.createPomodoro(userID, type, 25).catch(() => {});
              }
              setIsBreak(true);
              return BREAK;
            } else {
              setIsBreak(false);
              return WORK;
            }
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(ref.current);
  }, [running, isBreak, userID]);

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
              <circle cx={70} cy={70} r={R} fill="none" stroke={color} strokeWidth={5}
                strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
                style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 8px ${color})` }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ fontFamily: "monospace", fontSize: 32, color, fontWeight: 700 }}>{mm}:{ss}</div>
              <div style={{ fontSize: 14, color: "#bbb", letterSpacing: 2, marginTop: 2 }}>{isBreak ? "BREAK" : "WORK"}</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setRunning(r => !r)} style={{ background: running ? "#ff2d7822" : "#a855f722", border: `1px solid ${running ? "#ff2d7855" : "#a855f755"}`, color: running ? "#ff2d78" : "#a855f7", fontFamily: "monospace", fontSize: 13, padding: "8px 14px", borderRadius: 3, cursor: "pointer" }}>
                {running ? "⏸ PAUSAR" : "▶ INICIAR"}
              </button>
              <button onClick={reset} style={{ background: "transparent", border: "1px solid #1a1a2e", color: "#555", fontFamily: "monospace", fontSize: 13, padding: "8px 12px", borderRadius: 3, cursor: "pointer" }} title="Resetar timer">↺</button>
            </div>
            <div style={{ fontSize: 12, color: "#bbb", marginBottom: 8 }}>SESSÕES: <span style={{ color: "#a855f7", fontSize: 22, fontFamily: "monospace" }}>{sessions}</span></div>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ height: 6, flex: 1, borderRadius: 2, background: i < sessions % 4 ? "#a855f766" : "#1a1a2e", border: "1px solid #2a2a3e" }} />
              ))}
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

function routeFromHash() {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const [path] = hash.split("?");
  return path || "/";
}

function hashSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const idx = hash.indexOf("?");
  if (idx === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(idx + 1));
}

function LandingPage({ hasSession }) {
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
            {hasSession && (
              <a href="#/app" style={{ textDecoration: "none", background: "transparent", border: "1px solid #1f3a4e", color: "#00cfff", padding: "10px 18px", borderRadius: 4, fontSize: 13, letterSpacing: 1 }}>Abrir app</a>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: 20 }}>
          {[
            ["10 níveis", "Jornada estruturada de iniciante a especialista"],
            ["+50 conquistas", "Sistema de XP e marcos para manter consistência"],
            ["Metas diárias", "Ritmo de estudo com checklist objetivo"],
            ["Pomodoro", "Sessões de foco e pausa dentro da plataforma"],
          ].map(([title, desc]) => (
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

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 80% 0%, #1f0f2d, #06060a 55%)", color: "#f0f0ff", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#0a0a0f", border: "1px solid #2a2a4e", borderRadius: 8, padding: 26 }}>
        <div style={{ fontSize: 12, color: "#ff2d7877", letterSpacing: 3, marginBottom: 10 }}>GO_QUEST AUTH</div>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 50, lineHeight: 1, marginBottom: 8, background: "linear-gradient(90deg, #ff2d78, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18, lineHeight: 1.7 }}>{subtitle}</div>
        {children}
        <div style={{ marginTop: 14, fontSize: 12, color: "#777" }}>{footer}</div>
      </div>
    </div>
  );
}

function LoginPage({ onSubmit, pending, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onSubmit({ email: email.trim(), password });
  };

  return (
    <AuthCard title="LOGIN" subtitle="Entre com email e senha para recuperar seu progresso.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          type="password"
          autoComplete="current-password"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
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

function SignupPage({ onSubmit, pending, error }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setLocalError("");
    if (!username.trim() || !email.trim() || !password || !confirmPassword) return;
    if (password.length < 6) {
      setLocalError("A senha precisa ter no minimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("As senhas nao conferem.");
      return;
    }
    onSubmit({ username: username.trim(), email: email.trim(), password });
  };

  return (
    <AuthCard title="CADASTRO" subtitle="Crie seu usuário para iniciar a trilha com progresso salvo.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          autoComplete="email"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Senha (min. 6 caracteres)"
          autoComplete="new-password"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          placeholder="Confirmar senha"
          autoComplete="new-password"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
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

function ForgotPasswordPage({ onSubmit, pending, error, message }) {
  const [email, setEmail] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim());
  };

  return (
    <AuthCard title="RECUPERAR SENHA" subtitle="Informe seu email para receber um link de redefinicao.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          autoComplete="email"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
        <button type="submit" disabled={pending} style={{ background: "#ffcc0011", border: "1px solid #ffcc0055", color: "#ffcc00", padding: "10px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 13, opacity: pending ? 0.7 : 1 }}>
          {pending ? "Enviando..." : "Enviar link"}
        </button>
        {message && <div style={{ fontSize: 12, color: "#00ff88", lineHeight: 1.6 }}>{message}</div>}
        {error && <div style={{ fontSize: 12, color: "#ff6b6b", lineHeight: 1.6 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <a href="#/login" style={{ fontSize: 12, color: "#00cfff", textDecoration: "none" }}>Voltar ao login</a>
      </div>
    </AuthCard>
  );
}

function ResetPasswordPage({ token, onSubmit, pending, error, message }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setLocalError("");
    if (!token) {
      setLocalError("Token de redefinicao ausente no link.");
      return;
    }
    if (!password || !confirmPassword) return;
    if (password.length < 6) {
      setLocalError("A senha precisa ter no minimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("As senhas nao conferem.");
      return;
    }
    onSubmit({ token, password });
  };

  return (
    <AuthCard title="NOVA SENHA" subtitle="Defina uma nova senha para sua conta.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Nova senha"
          autoComplete="new-password"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          placeholder="Confirmar nova senha"
          autoComplete="new-password"
          style={{ width: "100%", background: "#06060a", border: "1px solid #1a1a2e", color: "#f0f0ff", padding: "11px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
        />
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

function AuthRequiredPage() {
  return (
    <AuthCard title="ACESSO" subtitle="Faça login ou cadastre um usuário antes de entrar no app.">
      <div style={{ display: "flex", gap: 10 }}>
        <a href="#/login" style={{ textDecoration: "none", background: "#a855f711", border: "1px solid #a855f755", color: "#a855f7", padding: "10px 14px", borderRadius: 4, fontSize: 13 }}>Login</a>
        <a href="#/cadastro" style={{ textDecoration: "none", background: "#ff2d7811", border: "1px solid #ff2d7855", color: "#ff2d78", padding: "10px 14px", borderRadius: 4, fontSize: 13 }}>Cadastro</a>
      </div>
      <div style={{ marginTop: 10 }}>
        <a href="#/" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>Voltar para apresentação</a>
      </div>
    </AuthCard>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const DAILY_GOALS = [
  "Escrever código Go por 30+ minutos",
  "Aprender ou revisar um conceito",
  "Ler documentação ou código alheio",
  "Resolver um exercício prático",
  "Fazer um commit no projeto pessoal",
];

export default function GoQuest() {
  const [route, setRoute] = useState(routeFromHash);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [userID, setUserID] = useState(null);
  const [totalXP, setTotalXP] = useState(0);
  const [unlocked, setUnlocked] = useState(new Set());
  const [todayDone, setTodayDone] = useState(new Set());
  const [tab, setTab] = useState("hoje");
  const [time, setTime] = useState(new Date());
  const [pulse, setPulse] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    setAuthError("");
    setAuthMessage("");
  }, [route]);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setPulse(v => !v), 1500); return () => clearInterval(t); }, []);

  // ── Init: create or load user from localStorage ───────────────────────────
  useEffect(() => {
    if (route !== "/app") return;

    async function init() {
      setLoading(true);
      let uid = localStorage.getItem("goquest_user_id");
      if (!uid) {
        setLoading(false);
        return;
      }
      setUserID(uid);

      // load summary (XP, level, streak)
      try {
        const summary = await api.getUser(uid);
        setTotalXP(summary.total_xp);
      } catch {}

      // load unlocked achievements
      try {
        const achs = await api.getUserAchievements(uid);
        setUnlocked(new Set((achs || []).map(a => a.achievement_id)));
      } catch {}

      // load today's goals
      try {
        const goals = await api.getDailyGoals(uid);
        setTodayDone(new Set(goals.completed || []));
      } catch {}

      setLoading(false);
    }
    init();
  }, [route]);

  // ── Recompute level from XP ───────────────────────────────────────────────
  const currentLevel = [...LEVELS].reverse().find(l => totalXP >= l.xpMin) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.id === currentLevel.id + 1);
  const xpIn = totalXP - currentLevel.xpMin;
  const xpNeed = (nextLevel?.xpMin ?? currentLevel.xpMax) - currentLevel.xpMin;

  const showNotif = useCallback((notif, ms = 2500) => {
    setNotification(notif);
    setTimeout(() => setNotification(null), ms);
  }, []);

  const goTo = useCallback((nextRoute) => {
    window.location.hash = nextRoute;
  }, []);

  const handleSignup = useCallback(async ({ username, email, password }) => {
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);
    try {
      const user = await api.register(username, email, password);
      if (!user?.id) throw new Error("Cadastro sem ID retornado.");
      localStorage.setItem("goquest_user_id", user.id);
      setUserID(user.id);
      setTotalXP(user.total_xp || 0);
      setUnlocked(new Set());
      setTodayDone(new Set());
      goTo("/app");
    } catch {
      setAuthError("Nao foi possivel criar a conta. Verifique os dados e tente novamente.");
    } finally {
      setAuthLoading(false);
    }
  }, [goTo]);

  const handleLogin = useCallback(async ({ email, password }) => {
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);
    try {
      const session = await api.login(email, password);
      if (!session?.user_id) throw new Error("Login sem user_id retornado.");
      localStorage.setItem("goquest_user_id", session.user_id);
      setUserID(session.user_id);
      if (typeof session.total_xp === "number") {
        setTotalXP(session.total_xp);
      }
      goTo("/app");
    } catch {
      setAuthError("Email ou senha invalidos.");
    } finally {
      setAuthLoading(false);
    }
  }, [goTo]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("goquest_user_id");
    setUserID(null);
    setTotalXP(0);
    setUnlocked(new Set());
    setTodayDone(new Set());
    goTo("/login");
  }, [goTo]);

  const handleForgotPassword = useCallback(async (email) => {
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);
    try {
      await api.forgotPassword(email);
      setAuthMessage("Se o email existir, enviamos um link de recuperacao.");
    } catch {
      setAuthError("Nao foi possivel solicitar a recuperacao agora. Tente novamente.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleResetPassword = useCallback(async ({ token, password }) => {
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);
    try {
      await api.resetPassword(token, password);
      setAuthMessage("Senha atualizada com sucesso. Voce ja pode fazer login.");
      setTimeout(() => goTo("/login"), 1200);
    } catch {
      setAuthError("Link invalido ou expirado. Solicite um novo.");
    } finally {
      setAuthLoading(false);
    }
  }, [goTo]);

  const toggleA = useCallback(async (id) => {
    if (!userID) return;
    const isUnlocked = unlocked.has(id);

    if (isUnlocked) {
      setUnlocked(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      try {
        await api.removeAchievement(userID, id);
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) {
          showNotif({ icon: "↺", title: `${ach.title} removida`, desc: `-${ach.xp} XP` });
        }
        const summary = await api.getUser(userID);
        setTotalXP(summary.total_xp);
      } catch {
        setUnlocked(prev => new Set([...prev, id]));
      }
      return;
    }

    try {
      await api.unlockAchievement(userID, id);
      setUnlocked(prev => new Set([...prev, id]));
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        const ms = MILESTONES.find(m => m.trigger === id);
        if (ms) showNotif(ms, 3500);
        else showNotif({ icon: ach.icon, title: ach.title, desc: `+${ach.xp} XP` });
      }
      const summary = await api.getUser(userID);
      setTotalXP(summary.total_xp);
    } catch {}
  }, [userID, unlocked, showNotif]);

  const toggleG = useCallback(async (i) => {
    if (!userID) return;
    if (todayDone.has(i)) {
      setTodayDone(prev => { const n = new Set(prev); n.delete(i); return n; });
      try {
        await api.uncompleteGoal(userID, i);
      } catch {
        setTodayDone(prev => new Set([...prev, i]));
      }
    } else {
      setTodayDone(prev => new Set([...prev, i]));
      try {
        await api.completeGoal(userID, i);
      } catch {
        setTodayDone(prev => { const n = new Set(prev); n.delete(i); return n; });
      }
    }
  }, [userID, todayDone]);

  const timeStr = time.toTimeString().slice(0, 8);
  const dateStr = time.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();

  const tabs = [["hoje","// HOJE"],["trilha","// TRILHA"],["timer","// POMODORO"],["ferramentas","// FERRAMENTAS"],["praticas","// BOAS PRÁTICAS"],["comunidade","// COMUNIDADE"],["mentor","// MENTOR AI"]];
  const resetToken = hashSearchParams().get("token") || "";

  if (route === "/") {
    return <LandingPage hasSession={Boolean(localStorage.getItem("goquest_user_id"))} />;
  }
  if (route === "/login") {
    return <LoginPage onSubmit={handleLogin} pending={authLoading} error={authError} />;
  }
  if (route === "/cadastro") {
    return <SignupPage onSubmit={handleSignup} pending={authLoading} error={authError} />;
  }
  if (route === "/forgot-password") {
    return <ForgotPasswordPage onSubmit={handleForgotPassword} pending={authLoading} error={authError} message={authMessage} />;
  }
  if (route === "/reset-password") {
    return <ResetPasswordPage token={resetToken} onSubmit={handleResetPassword} pending={authLoading} error={authError} message={authMessage} />;
  }
  if (route !== "/app") {
    return <LandingPage hasSession={Boolean(localStorage.getItem("goquest_user_id"))} />;
  }
  if (!loading && !userID) {
    return <AuthRequiredPage />;
  }

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
        .acard:hover { opacity:1 !important; border-color:#ffffff22 !important; }
        input::placeholder { color:#3a3a5e; }
        input:focus { border-color:#ff2d7844 !important; }
        .notif { animation: slidein 0.3s ease, fadeout 0.5s ease 2.5s forwards; }
      `}</style>

      {/* Notification */}
      {notification && (
        <div className="notif" style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: "#0a0a0f", border: "1px solid #ff2d7844", borderRadius: 4, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 0 20px #ff2d7833" }}>
          <span style={{ fontSize: 22 }}>{notification.icon}</span>
          <div>
            <div style={{ fontSize: 14, color: "#ff2d78", fontWeight: 700 }}>{notification.title}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{notification.desc}</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "100%", padding: "24px 48px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#ff2d7877", letterSpacing: 4, marginBottom: 4 }}>GOPHER TERMINAL v3.0{loading && <span style={{ color: "#ffcc0088", marginLeft: 16 }}>SINCRONIZANDO▌</span>}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 60, lineHeight: 1, letterSpacing: 3, background: "linear-gradient(90deg, #ff2d78, #ff6b35, #ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 16px #ff2d7844)" }}>GO_QUEST</div>
              <div style={{ fontSize: 12, color: "#ff2d7855", letterSpacing: 3, marginTop: 3 }}>{'>'} DE ZERO AO ESPECIALISTA <span style={{ animation: "blink 1s step-end infinite", display: "inline-block" }}>█</span></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 30, letterSpacing: 3, background: "linear-gradient(90deg, #a855f7, #ff2d78)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{timeStr}</div>
              <div style={{ fontSize: 12, color: "#a855f755", letterSpacing: 2, marginTop: 1 }}>{dateStr}</div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <a href="#/" style={{ fontSize: 12, color: "#00cfff", textDecoration: "none", border: "1px solid #00cfff33", borderRadius: 3, padding: "3px 8px" }}>
                  inicio
                </a>
                <button onClick={handleLogout} style={{ fontSize: 12, color: "#ff6b6b", background: "transparent", border: "1px solid #ff6b6b33", borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontFamily: "monospace" }}>
                  sair
                </button>
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg, #ff2d7855, #ff6b3533, transparent)", marginTop: 12 }} />
          <div style={{ height: 1, background: "linear-gradient(90deg, #a855f733, transparent)", marginTop: 2 }} />
        </div>

        {/* STATS */}
        <div style={{ background: "#0a0a0f", border: "1px solid #2a2a4e", borderRadius: 4, padding: "16px 20px", marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24 }}>
          {[
            { label: "NÍVEL", value: currentLevel.id, sub: currentLevel.title, color: currentLevel.color },
            { label: "XP TOTAL", value: totalXP, sub: `${xpIn}/${xpNeed} próx.`, color: "#00cfff" },
            { label: "CONQUISTAS", value: `${unlocked.size}/${ACHIEVEMENTS.length}`, sub: `${Math.round(unlocked.size / ACHIEVEMENTS.length * 100)}% completo`, color: "#ff2d78" },
            { label: "MARCOS", value: MILESTONES.filter(m => unlocked.has(m.trigger)).length, sub: `de ${MILESTONES.length} especiais`, color: "#ffcc00" },
            { label: "HOJE", value: `${todayDone.size}/5`, sub: todayDone.size === 5 ? "🔥 dia perfeito!" : "metas do dia", color: "#00ff88" },
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
        <div style={{ display: "flex", borderBottom: "1px solid #1a1a2e", marginBottom: 20, overflowX: "auto" }}>
          {tabs.map(([id, label]) => (
            <button key={id} className={`tbtn${tab === id ? " act" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── HOJE ── */}
        {tab === "hoje" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 14 }}>// METAS DO DIA</div>
              {DAILY_GOALS.map((goal, i) => (
                <div key={i} className="row" onClick={() => toggleG(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 3, marginBottom: 4, background: todayDone.has(i) ? "#a855f711" : "transparent", border: `1px solid ${todayDone.has(i) ? "#a855f733" : "transparent"}`, cursor: "pointer", transition: "all 0.15s", userSelect: "none" }}>
                  <span style={{ fontSize: 13, color: todayDone.has(i) ? "#a855f7" : "#2a2a3e", flexShrink: 0 }}>{todayDone.has(i) ? "◉" : "○"}</span>
                  <span style={{ fontSize: 13, color: todayDone.has(i) ? "#c0a0ff" : "#444", textDecoration: todayDone.has(i) ? "line-through" : "none" }}>{goal}</span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <ProgressBar value={todayDone.size} max={5} color="#a855f7" />
              </div>
            </div>

            <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2, marginBottom: 14 }}>// CONQUISTAS DO NÍVEL ATUAL</div>
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
        )}

        {/* ── TRILHA ── */}
        {tab === "trilha" && (
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
        )}

        {tab === "timer" && <PomodoroTab userID={userID} />}

        {/* ── FERRAMENTAS ── */}
        {tab === "ferramentas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#bbb", letterSpacing: 1, marginBottom: 8, lineHeight: 1.8 }}>
              Ferramentas desbloqueadas conforme você avança. As marcadas são relevantes para seu nível atual ou anterior.
            </div>
            {TOOLS.map(t => {
              const relevant = t.level <= currentLevel.id + 1;
              const current = t.level === currentLevel.id;
              return (
                <div key={t.name} style={{ background: "#0a0a0f", border: `1px solid ${current ? "#ff2d7833" : "#1a1a2e"}`, borderRadius: 4, padding: "12px 16px", opacity: relevant ? 1 : 0.35, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flexShrink: 0, width: 28, textAlign: "center" }}>
                    <div style={{ fontFamily: "'VT323', monospace", fontSize: 20, color: LEVELS[t.level - 1]?.color || "#444" }}>{t.level}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: relevant ? "#f0f0ff" : "#444", fontWeight: 700 }}>{t.name}</span>
                      {current && <Tag color="#ff2d78">AGORA</Tag>}
                    </div>
                    <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.5 }}>{t.desc}</div>
                  </div>
                  <a href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#ff2d7866", textDecoration: "none", flexShrink: 0, padding: "4px 10px", border: "1px solid #ff2d7833", borderRadius: 2 }} onClick={e => e.stopPropagation()}>docs →</a>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BOAS PRÁTICAS ── */}
        {tab === "praticas" && (
          <div>
            <div style={{ fontSize: 12, color: "#bbb", letterSpacing: 1, marginBottom: 16, lineHeight: 1.8 }}>
              Boas práticas idiomáticas de Go. Entender isso separa um dev que escreve Go de um Gopher de verdade.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PRACTICES.map(p => (
                <div key={p.id} style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: "14px 16px" }}>
                  <div style={{ fontSize: 14, color: "#a855f7", fontWeight: 700, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.6 }}>{p.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, background: "#0a0a0f", border: "1px solid #a855f722", borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#a855f755", letterSpacing: 2, marginBottom: 8 }}>// RECURSOS ESSENCIAIS</div>
              {[["Effective Go","https://go.dev/doc/effective_go","O guia oficial de idiomas Go"],["Go Proverbs","https://go-proverbs.github.io","Princípios filosóficos do Go por Rob Pike"],["Code Review Comments","https://github.com/golang/go/wiki/CodeReviewComments","O que os core devs comentam em PRs"],["The Go Programming Language","https://www.gopl.io","O livro de referência definitivo"]].map(([name, url, desc]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #1a1a2e" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#c0a0ff" }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{desc}</div>
                  </div>
                  <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#a855f766", textDecoration: "none", padding: "4px 10px", border: "1px solid #a855f733", borderRadius: 2 }}>abrir →</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMUNIDADE ── */}
        {tab === "comunidade" && (
          <div>
            <div style={{ fontSize: 12, color: "#bbb", letterSpacing: 1, marginBottom: 16, lineHeight: 1.8 }}>
              A comunidade Go é conhecida por ser uma das mais acolhedoras do mundo. Use isso ao seu favor.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {COMMUNITY.map(c => (
                <div key={c.name} style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 4, padding: 16 }}>
                  <div style={{ fontSize: 14, color: "#f0f0ff", fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#bbb", marginBottom: 12, lineHeight: 1.5 }}>{c.desc}</div>
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#ff2d7877", textDecoration: "none", padding: "5px 12px", border: "1px solid #ff2d7833", borderRadius: 2, display: "inline-block" }}>acessar →</a>
                </div>
              ))}
            </div>
            <div style={{ background: "#0a0a0f", border: "1px solid #ffcc0022", borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#ffcc0055", letterSpacing: 2, marginBottom: 10 }}>// DICA DE COMUNIDADE</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
                Uma das melhores formas de aprender é <span style={{ color: "#ffcc00" }}>ajudar outros em dúvidas simples</span> no Slack ou Reddit. Você fixa o conhecimento ensinando e ainda constrói reputação na comunidade. Comece pelo canal #beginners no Gophers Slack.
              </div>
            </div>
          </div>
        )}

        {/* ── MENTOR ── */}
        {tab === "mentor" && (
          <MentorTab unlocked={unlocked} totalXP={totalXP} currentLevel={currentLevel} todayDone={todayDone} />
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
