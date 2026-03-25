package chat

import "time"

// InboundMessage é o que o cliente envia via WebSocket.
type InboundMessage struct {
	Type       string `json:"type"`        // "global_msg" | "direct_msg" | "mark_read"
	Content    string `json:"content"`     // texto da mensagem
	ReceiverID string `json:"receiver_id"` // usado em direct_msg
	SenderID   string `json:"sender_id"`   // usado em mark_read (marcar msgs deste sender como lidas)
}

// OutboundMessage é o que o servidor envia ao cliente via WebSocket.
type OutboundMessage struct {
	Type       string    `json:"type"`                  // "global_msg" | "direct_msg" | "presence" | "unread_update"
	ID         string    `json:"id,omitempty"`          // UUID da mensagem
	UserID     string    `json:"user_id,omitempty"`     // remetente ou user de presença
	Username   string    `json:"username,omitempty"`    // nome do remetente
	ReceiverID string    `json:"receiver_id,omitempty"` // destinatário em DMs
	Content    string    `json:"content,omitempty"`     // texto
	Status     string    `json:"status,omitempty"`      // "online" | "offline" (presença)
	Timestamp  time.Time `json:"timestamp"`
}
