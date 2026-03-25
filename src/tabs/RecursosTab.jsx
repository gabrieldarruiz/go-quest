import { Tag } from "../components/ui.jsx";
import { TOOLS, PRACTICES, COMMUNITY, LEVELS } from "../data/constants.js";

export function FerramentasTab({ currentLevel }) {
  return (
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
  );
}

export function PraticasTab() {
  return (
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
  );
}

export function ComunidadeTab() {
  return (
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
  );
}
