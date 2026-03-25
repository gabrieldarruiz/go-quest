package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/darraos/go-quest-backend/internal/chat"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS já tratado pelo middleware
	},
}

// ChatHandler embeds Handler e guarda referência ao hub WebSocket.
type ChatHandler struct {
	*Handler
	hub *chat.Hub
}

func NewChatHandler(h *Handler, hub *chat.Hub) *ChatHandler {
	return &ChatHandler{Handler: h, hub: hub}
}

// ServeWS faz upgrade da conexão HTTP para WebSocket.
// GET /ws?userID=<uuid>
func (ch *ChatHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.URL.Query().Get("userID")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "userID inválido", http.StatusBadRequest)
		return
	}

	user, err := ch.repo.GetUser(r.Context(), userID)
	if err != nil {
		http.Error(w, "usuário não encontrado", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := chat.NewClient(ch.hub, conn, userID, user.Username)
	client.OnMessage = ch.makeMessageHandler()

	ch.hub.Register(client)

	// Envia lista de usuários online ao conectar
	onlineIDs := ch.hub.OnlineUsers()
	onlineMsg := chat.OutboundMessage{
		Type:      "online_list",
		Timestamp: time.Now(),
	}
	// Embutimos os IDs no campo Username como JSON serializado (workaround sem campo extra)
	idsJSON, _ := json.Marshal(onlineIDs)
	onlineMsg.Content = string(idsJSON)
	client.SendMsg(onlineMsg)

	client.Run()
}

// makeMessageHandler retorna o callback de mensagens inbound.
func (ch *ChatHandler) makeMessageHandler() func(*chat.Client, chat.InboundMessage) {
	return func(c *chat.Client, msg chat.InboundMessage) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		content := strings.TrimSpace(msg.Content)

		switch msg.Type {
		case "global_msg":
			if len(content) == 0 || len(content) > 500 {
				return
			}
			saved, err := ch.repo.SaveGlobalMessage(ctx, c.UserID, c.Username, content)
			if err != nil {
				return
			}
			ch.hub.BroadcastGlobal(chat.OutboundMessage{
				Type:      "global_msg",
				ID:        saved.ID.String(),
				UserID:    saved.UserID.String(),
				Username:  saved.Username,
				Content:   saved.Content,
				Timestamp: saved.CreatedAt,
			})

		case "direct_msg":
			if len(content) == 0 || len(content) > 500 {
				return
			}
			receiverID, err := uuid.Parse(msg.ReceiverID)
			if err != nil || receiverID == c.UserID {
				return
			}
			// Valida que os dois são amigos antes de salvar
			friends, err := ch.repo.AreFriends(ctx, c.UserID, receiverID)
			if err != nil || !friends {
				return
			}
			saved, err := ch.repo.SaveDirectMessage(ctx, c.UserID, receiverID, content)
			if err != nil {
				return
			}
			out := chat.OutboundMessage{
				Type:       "direct_msg",
				ID:         saved.ID.String(),
				UserID:     saved.SenderID.String(),
				Username:   c.Username,
				ReceiverID: saved.ReceiverID.String(),
				Content:    saved.Content,
				Timestamp:  saved.CreatedAt,
			}
			ch.hub.SendDirect(receiverID, out)
			c.SendMsg(out)

		case "mark_read":
			senderID, err := uuid.Parse(msg.SenderID)
			if err != nil {
				return
			}
			ch.repo.MarkMessagesRead(ctx, senderID, c.UserID)
		}
	}
}

// GetGlobalHistory retorna as últimas mensagens do chat global.
// GET /api/chat/global/history?limit=50
func (ch *ChatHandler) GetGlobalHistory(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}

	msgs, err := ch.repo.GetGlobalHistory(r.Context(), limit)
	if err != nil {
		http.Error(w, "erro ao buscar histórico", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// GetDMHistory retorna histórico de mensagens diretas paginado.
// GET /api/users/{userID}/dm/{friendID}/history?limit=50&before=<msgID>
func (ch *ChatHandler) GetDMHistory(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		http.Error(w, "userID inválido", http.StatusBadRequest)
		return
	}
	friendID, err := uuid.Parse(chi.URLParam(r, "friendID"))
	if err != nil {
		http.Error(w, "friendID inválido", http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}
	beforeID := r.URL.Query().Get("before")

	msgs, err := ch.repo.GetDirectHistory(r.Context(), userID, friendID, limit, beforeID)
	if err != nil {
		http.Error(w, "erro ao buscar histórico", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// GetDMConversations retorna lista de conversas com badge de não lidas e status online.
// GET /api/users/{userID}/dm/conversations
func (ch *ChatHandler) GetDMConversations(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		http.Error(w, "userID inválido", http.StatusBadRequest)
		return
	}

	convs, err := ch.repo.GetDMConversations(r.Context(), userID)
	if err != nil {
		http.Error(w, "erro ao buscar conversas", http.StatusInternalServerError)
		return
	}

	type ConvWithOnline struct {
		FriendID    string    `json:"friend_id"`
		Username    string    `json:"username"`
		UnreadCount int       `json:"unread_count"`
		LastMessage string    `json:"last_message"`
		LastAt      time.Time `json:"last_at"`
		IsOnline    bool      `json:"is_online"`
	}

	result := make([]ConvWithOnline, 0, len(convs))
	for _, c := range convs {
		result = append(result, ConvWithOnline{
			FriendID:    c.FriendID.String(),
			Username:    c.Username,
			UnreadCount: c.UnreadCount,
			LastMessage: c.LastMessage,
			LastAt:      c.LastAt,
			IsOnline:    ch.hub.IsOnline(c.FriendID),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
