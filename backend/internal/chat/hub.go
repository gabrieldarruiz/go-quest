package chat

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// Hub mantém todas as conexões ativas e faz broadcast de mensagens.
type Hub struct {
	mu      sync.RWMutex
	clients map[uuid.UUID]*Client // userID → client
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[uuid.UUID]*Client),
	}
}

// Register adiciona um client ao hub e notifica todos do usuário online.
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	// Se já havia uma conexão anterior do mesmo user, fecha ela
	if old, ok := h.clients[c.UserID]; ok {
		old.close()
	}
	h.clients[c.UserID] = c
	h.mu.Unlock()

	h.broadcastPresence(c.UserID, c.Username, true)
}

// Unregister remove o client e notifica todos do usuário offline.
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	if current, ok := h.clients[c.UserID]; ok && current == c {
		delete(h.clients, c.UserID)
	}
	h.mu.Unlock()

	h.broadcastPresence(c.UserID, c.Username, false)
}

// BroadcastGlobal envia uma mensagem para todos os clientes conectados.
func (h *Hub) BroadcastGlobal(msg OutboundMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, c := range h.clients {
		c.SendMsg(msg)
	}
}

// SendDirect envia uma mensagem apenas para o destinatário, se online.
func (h *Hub) SendDirect(receiverID uuid.UUID, msg OutboundMessage) {
	h.mu.RLock()
	c, ok := h.clients[receiverID]
	h.mu.RUnlock()
	if ok {
		c.SendMsg(msg)
	}
}

// OnlineUsers retorna a lista de userIDs online.
func (h *Hub) OnlineUsers() []uuid.UUID {
	h.mu.RLock()
	defer h.mu.RUnlock()
	ids := make([]uuid.UUID, 0, len(h.clients))
	for id := range h.clients {
		ids = append(ids, id)
	}
	return ids
}

// IsOnline verifica se um usuário está conectado.
func (h *Hub) IsOnline(userID uuid.UUID) bool {
	h.mu.RLock()
	_, ok := h.clients[userID]
	h.mu.RUnlock()
	return ok
}

func (h *Hub) broadcastPresence(userID uuid.UUID, username string, online bool) {
	status := "offline"
	if online {
		status = "online"
	}
	msg := OutboundMessage{
		Type:      "presence",
		UserID:    userID.String(),
		Username:  username,
		Status:    status,
		Timestamp: time.Now(),
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, c := range h.clients {
		c.SendMsg(msg)
	}
}
