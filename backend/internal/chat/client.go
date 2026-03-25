package chat

import (
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 // bytes por mensagem
	sendBufferSize = 64   // mensagens em buffer antes de descartar
)

// Client representa uma conexão WebSocket de um usuário.
type Client struct {
	UserID   uuid.UUID
	Username string

	hub    *Hub
	conn   *websocket.Conn
	outbox chan OutboundMessage

	// OnMessage é chamado quando chega uma mensagem do cliente.
	OnMessage func(c *Client, msg InboundMessage)
}

func NewClient(hub *Hub, conn *websocket.Conn, userID uuid.UUID, username string) *Client {
	return &Client{
		UserID:   userID,
		Username: username,
		hub:      hub,
		conn:     conn,
		outbox:   make(chan OutboundMessage, sendBufferSize),
	}
}

// Run inicia as goroutines de leitura e escrita. Bloqueia até a conexão fechar.
func (c *Client) Run() {
	go c.writePump()
	c.readPump() // bloqueia
}

// SendMsg envia uma mensagem ao cliente (usado pelo hub e pelo handler).
func (c *Client) SendMsg(msg OutboundMessage) {
	select {
	case c.outbox <- msg:
	default:
		// buffer cheio — descarta silenciosamente
	}
}

func (c *Client) close() {
	c.conn.Close()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("chat ws read error user=%s: %v", c.UserID, err)
			}
			break
		}

		var msg InboundMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}

		if c.OnMessage != nil {
			c.OnMessage(c, msg)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.outbox:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			data, err := json.Marshal(msg)
			if err != nil {
				continue
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
