import { useEffect, useRef, useState, useCallback } from "react";
import {
  connectChatWS,
  getGlobalHistory,
  getDMHistory,
  getDMConversations,
} from "./api";

// ─── Utilitários ─────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ChatTab({ user }) {
  const [tab, setTab] = useState("global"); // "global" | "dm"
  const [conversations, setConversations] = useState([]); // lista de amigos + unread
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [onlineIDs, setOnlineIDs] = useState(new Set());

  const [globalMessages, setGlobalMessages] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);
  const [input, setInput] = useState("");

  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef(null);
  const globalEndRef = useRef(null);
  const dmEndRef = useRef(null);

  const userID = user?.id;
  const username = user?.username;

  // ─── Carrega histórico inicial ──────────────────────────────────────────────

  useEffect(() => {
    if (!userID) return;
    getGlobalHistory(50).then(setGlobalMessages).catch(() => {});
    getDMConversations(userID).then(setConversations).catch(() => {});
  }, [userID]);

  useEffect(() => {
    if (!selectedFriend || !userID) return;
    getDMHistory(userID, selectedFriend.friend_id, 50).then(setDmMessages).catch(() => {});
    // Marca como lidas ao abrir a conversa (via WS mark_read)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mark_read", sender_id: selectedFriend.friend_id }));
    }
    // Zera badge localmente
    setConversations((prev) =>
      prev.map((c) =>
        c.friend_id === selectedFriend.friend_id ? { ...c, unread_count: 0 } : c
      )
    );
  }, [selectedFriend, userID]);

  // ─── Scroll automático ──────────────────────────────────────────────────────

  useEffect(() => {
    globalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [globalMessages]);

  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  // ─── WebSocket ──────────────────────────────────────────────────────────────

  const handleWSMessage = useCallback(
    (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "online_list": {
          // content contém JSON de array de UUIDs
          try {
            const ids = JSON.parse(msg.content);
            setOnlineIDs(new Set(ids));
          } catch {}
          break;
        }
        case "presence": {
          setOnlineIDs((prev) => {
            const next = new Set(prev);
            if (msg.status === "online") next.add(msg.user_id);
            else next.delete(msg.user_id);
            return next;
          });
          break;
        }
        case "global_msg": {
          setGlobalMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          break;
        }
        case "direct_msg": {
          const isFromSelected =
            msg.user_id === selectedFriend?.friend_id ||
            msg.receiver_id === selectedFriend?.friend_id;

          if (tab === "dm" && isFromSelected) {
            setDmMessages((prev) => {
              // Evita duplicar se já existe (mensagem enviada pelo próprio user confirmada pelo servidor)
              if (prev.some((m) => m.id === msg.id)) return prev;
              // Remove placeholder temporário do mesmo remetente com conteúdo igual
              const filtered = prev.filter(
                (m) => !(m.id?.startsWith("tmp-") && m.content === msg.content && m.user_id === msg.user_id)
              );
              return [...filtered, msg];
            });
            // Marca como lida imediatamente
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "mark_read", sender_id: msg.user_id }));
            }
          } else {
            // Incrementa badge do remetente
            const senderID = msg.user_id === userID ? msg.receiver_id : msg.user_id;
            setConversations((prev) =>
              prev.map((c) =>
                c.friend_id === senderID
                  ? { ...c, unread_count: c.unread_count + 1, last_message: msg.content, last_at: msg.timestamp }
                  : c
              )
            );
          }
          break;
        }
      }
    },
    [tab, selectedFriend, userID]
  );

  const connectWS = useCallback(() => {
    if (!userID) return;
    const ws = connectChatWS(userID);
    wsRef.current = ws;

    ws.onmessage = handleWSMessage;
    ws.onerror = () => {};
    ws.onclose = () => {
      // Reconexão com exponential backoff (máx 30s)
      const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
      retryRef.current += 1;
      retryTimerRef.current = setTimeout(connectWS, delay);
    };
    ws.onopen = () => {
      retryRef.current = 0; // reseta contador ao conectar
    };
  }, [userID, handleWSMessage]);

  useEffect(() => {
    connectWS();
    return () => {
      clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, [connectWS]);

  // ─── Envio de mensagem ──────────────────────────────────────────────────────

  function sendMessage(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (tab === "global") {
      wsRef.current.send(JSON.stringify({ type: "global_msg", content }));
    } else if (selectedFriend) {
      wsRef.current.send(
        JSON.stringify({ type: "direct_msg", content, receiver_id: selectedFriend.friend_id })
      );
      // Adiciona localmente (o servidor confirmará via WS)
      setDmMessages((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          user_id: userID,
          username,
          receiver_id: selectedFriend.friend_id,
          content,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setInput("");
  }

  // ─── Paginação (scroll infinito no topo) ────────────────────────────────────

  async function loadMoreDM() {
    if (!selectedFriend || dmMessages.length === 0) return;
    const oldest = dmMessages[0];
    try {
      const older = await getDMHistory(userID, selectedFriend.friend_id, 50, oldest.id);
      if (older.length > 0) setDmMessages((prev) => [...older, ...prev]);
    } catch {}
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <div style={styles.container}>
      {/* Tabs internas */}
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tabBtn, ...(tab === "global" ? styles.tabBtnActive : {}) }}
          onClick={() => setTab("global")}
        >
          🌐 Global
        </button>
        <button
          style={{ ...styles.tabBtn, ...(tab === "dm" ? styles.tabBtnActive : {}) }}
          onClick={() => setTab("dm")}
        >
          💬 Mensagens
          {totalUnread > 0 && <span style={styles.badge}>{totalUnread}</span>}
        </button>
      </div>

      <div style={styles.body}>
        {tab === "global" ? (
          <GlobalChat
            messages={globalMessages}
            userID={userID}
            onlineIDs={onlineIDs}
            input={input}
            setInput={setInput}
            onSend={sendMessage}
            endRef={globalEndRef}
          />
        ) : (
          <DMView
            conversations={conversations}
            selectedFriend={selectedFriend}
            setSelectedFriend={setSelectedFriend}
            messages={dmMessages}
            userID={userID}
            onlineIDs={onlineIDs}
            input={input}
            setInput={setInput}
            onSend={sendMessage}
            endRef={dmEndRef}
            onLoadMore={loadMoreDM}
          />
        )}
      </div>
    </div>
  );
}

// ─── Chat Global ──────────────────────────────────────────────────────────────

function GlobalChat({ messages, userID, onlineIDs, input, setInput, onSend, endRef }) {
  return (
    <div style={styles.chatArea}>
      <div style={styles.onlinePill}>
        🟢 {onlineIDs.size} online agora
      </div>
      <div style={styles.messageList}>
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} isMine={m.user_id === userID} />
        ))}
        <div ref={endRef} />
      </div>
      <ChatInput input={input} setInput={setInput} onSend={onSend} />
    </div>
  );
}

// ─── DM View ──────────────────────────────────────────────────────────────────

function DMView({
  conversations,
  selectedFriend,
  setSelectedFriend,
  messages,
  userID,
  onlineIDs,
  input,
  setInput,
  onSend,
  endRef,
  onLoadMore,
}) {
  return (
    <div style={styles.dmLayout}>
      {/* Sidebar de conversas */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTitle}>Amigos</div>
        {conversations.length === 0 && (
          <div style={styles.emptyText}>Nenhum amigo ainda</div>
        )}
        {conversations.map((c) => (
          <button
            key={c.friend_id}
            style={{
              ...styles.friendItem,
              ...(selectedFriend?.friend_id === c.friend_id ? styles.friendItemActive : {}),
            }}
            onClick={() => setSelectedFriend(c)}
          >
            <span style={styles.onlineDot}>
              {onlineIDs.has(c.friend_id) ? "🟢" : "⚪"}
            </span>
            <span style={styles.friendName}>{c.username}</span>
            {c.unread_count > 0 && (
              <span style={styles.badge}>{c.unread_count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Área de mensagens */}
      <div style={styles.chatArea}>
        {!selectedFriend ? (
          <div style={styles.selectPrompt}>Selecione um amigo para conversar</div>
        ) : (
          <>
            <div style={styles.dmHeader}>
              <span>{onlineIDs.has(selectedFriend.friend_id) ? "🟢" : "⚪"}</span>
              <strong style={{ marginLeft: 6 }}>{selectedFriend.username}</strong>
            </div>
            <div style={styles.messageList}>
              {messages.length >= 50 && (
                <button style={styles.loadMoreBtn} onClick={onLoadMore}>
                  Carregar mais
                </button>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} isMine={m.user_id === userID} />
              ))}
              <div ref={endRef} />
            </div>
            <ChatInput input={input} setInput={setInput} onSend={onSend} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }) {
  return (
    <div style={{ ...styles.bubble, ...(isMine ? styles.bubbleMine : styles.bubbleOther) }}>
      {!isMine && <div style={styles.bubbleUsername}>{msg.username}</div>}
      <div style={styles.bubbleContent}>{msg.content}</div>
      <div style={styles.bubbleTime}>{formatTime(msg.timestamp || msg.created_at)}</div>
    </div>
  );
}

function ChatInput({ input, setInput, onSend }) {
  return (
    <form style={styles.inputRow} onSubmit={onSend}>
      <input
        style={styles.input}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Digite uma mensagem..."
        maxLength={500}
        autoComplete="off"
      />
      <button style={styles.sendBtn} type="submit" disabled={!input.trim()}>
        Enviar
      </button>
    </form>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    background: "#0f1117",
    borderRadius: 12,
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid #1e2130",
    background: "#151824",
    flexShrink: 0,
  },
  tabBtn: {
    flex: 1,
    padding: "10px 0",
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabBtnActive: {
    color: "#00d4ff",
    borderBottom: "2px solid #00d4ff",
  },
  badge: {
    background: "#e53e3e",
    color: "#fff",
    borderRadius: 10,
    padding: "1px 6px",
    fontSize: 11,
    fontWeight: 700,
    minWidth: 18,
    textAlign: "center",
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: "flex",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  onlinePill: {
    padding: "6px 14px",
    fontSize: 12,
    color: "#4ade80",
    background: "#0d1a12",
    borderBottom: "1px solid #1e2130",
    flexShrink: 0,
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  bubble: {
    maxWidth: "72%",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.4,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    background: "#00d4ff22",
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    background: "#1e2130",
    borderBottomLeftRadius: 2,
  },
  bubbleUsername: {
    fontSize: 11,
    color: "#00d4ff",
    marginBottom: 2,
    fontWeight: 600,
  },
  bubbleContent: {
    color: "#e2e8f0",
    wordBreak: "break-word",
  },
  bubbleTime: {
    fontSize: 10,
    color: "#555",
    textAlign: "right",
    marginTop: 2,
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "10px 14px",
    borderTop: "1px solid #1e2130",
    background: "#151824",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "#0f1117",
    border: "1px solid #1e2130",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: "#00d4ff",
    color: "#0f1117",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  dmLayout: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },
  sidebar: {
    width: 200,
    borderRight: "1px solid #1e2130",
    display: "flex",
    flexDirection: "column",
    background: "#0d0f16",
    flexShrink: 0,
    overflowY: "auto",
  },
  sidebarTitle: {
    padding: "10px 14px",
    fontSize: 12,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1px solid #1e2130",
  },
  friendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    background: "none",
    border: "none",
    color: "#c0c8d8",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
    borderBottom: "1px solid #1a1f2e",
    width: "100%",
  },
  friendItemActive: {
    background: "#00d4ff15",
    color: "#00d4ff",
  },
  onlineDot: {
    fontSize: 10,
    flexShrink: 0,
  },
  friendName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emptyText: {
    padding: "16px 14px",
    color: "#555",
    fontSize: 13,
  },
  dmHeader: {
    padding: "10px 14px",
    borderBottom: "1px solid #1e2130",
    display: "flex",
    alignItems: "center",
    fontSize: 14,
    color: "#c0c8d8",
    flexShrink: 0,
    background: "#0d0f16",
  },
  selectPrompt: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#555",
    fontSize: 14,
  },
  loadMoreBtn: {
    alignSelf: "center",
    background: "none",
    border: "1px solid #1e2130",
    color: "#555",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
    marginBottom: 8,
  },
};
