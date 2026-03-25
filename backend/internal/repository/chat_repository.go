package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/darraos/go-quest-backend/internal/models"
)

// SaveGlobalMessage persiste uma mensagem no chat global.
func (r *Repository) SaveGlobalMessage(ctx context.Context, userID uuid.UUID, username, content string) (*models.GlobalMessage, error) {
	msg := &models.GlobalMessage{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chat_global_messages (user_id, username, content)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, username, content, created_at
	`, userID, username, content).Scan(&msg.ID, &msg.UserID, &msg.Username, &msg.Content, &msg.CreatedAt)
	if err != nil {
		return nil, err
	}
	return msg, nil
}

// GetGlobalHistory retorna as últimas N mensagens globais (ordem cronológica).
func (r *Repository) GetGlobalHistory(ctx context.Context, limit int) ([]models.GlobalMessage, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, username, content, created_at
		FROM chat_global_messages
		ORDER BY created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	msgs := make([]models.GlobalMessage, 0)
	for rows.Next() {
		var m models.GlobalMessage
		if err := rows.Scan(&m.ID, &m.UserID, &m.Username, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}

	// Inverte para ordem cronológica (mais antigas primeiro)
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

// SaveDirectMessage persiste uma mensagem direta.
func (r *Repository) SaveDirectMessage(ctx context.Context, senderID, receiverID uuid.UUID, content string) (*models.DirectMessage, error) {
	msg := &models.DirectMessage{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chat_direct_messages (sender_id, receiver_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, sender_id, receiver_id, content, read_at, created_at
	`, senderID, receiverID, content).Scan(
		&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.ReadAt, &msg.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return msg, nil
}

// GetDirectHistory retorna mensagens entre dois usuários, paginadas por cursor.
// beforeID: UUID da mensagem mais antiga já carregada (cursor); vazio = sem cursor.
func (r *Repository) GetDirectHistory(ctx context.Context, userA, userB uuid.UUID, limit int, beforeID string) ([]models.DirectMessage, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var rows interface{ Next() bool; Scan(...interface{}) error; Close() }
	var err error

	if beforeID == "" {
		rows, err = r.pool.Query(ctx, `
			SELECT id, sender_id, receiver_id, content, read_at, created_at
			FROM chat_direct_messages
			WHERE (sender_id = $1 AND receiver_id = $2)
			   OR (sender_id = $2 AND receiver_id = $1)
			ORDER BY created_at DESC
			LIMIT $3
		`, userA, userB, limit)
	} else {
		cursorID, parseErr := uuid.Parse(beforeID)
		if parseErr != nil {
			return nil, parseErr
		}
		rows, err = r.pool.Query(ctx, `
			SELECT id, sender_id, receiver_id, content, read_at, created_at
			FROM chat_direct_messages
			WHERE ((sender_id = $1 AND receiver_id = $2)
			   OR  (sender_id = $2 AND receiver_id = $1))
			  AND created_at < (SELECT created_at FROM chat_direct_messages WHERE id = $4)
			ORDER BY created_at DESC
			LIMIT $3
		`, userA, userB, limit, cursorID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	msgs := make([]models.DirectMessage, 0)
	for rows.Next() {
		var m models.DirectMessage
		if err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Content, &m.ReadAt, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}

	// Inverte para cronológico
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

// MarkMessagesRead marca como lidas todas as msgs de senderID para receiverID.
func (r *Repository) MarkMessagesRead(ctx context.Context, senderID, receiverID uuid.UUID) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		UPDATE chat_direct_messages
		SET read_at = $1
		WHERE sender_id = $2 AND receiver_id = $3 AND read_at IS NULL
	`, now, senderID, receiverID)
	return err
}

// GetUnreadCounts retorna contagem de não lidas por remetente para um dado receiverID.
func (r *Repository) GetUnreadCounts(ctx context.Context, receiverID uuid.UUID) (map[uuid.UUID]int, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT sender_id, COUNT(*) AS unread_count
		FROM chat_direct_messages
		WHERE receiver_id = $1 AND read_at IS NULL
		GROUP BY sender_id
	`, receiverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[uuid.UUID]int)
	for rows.Next() {
		var senderID uuid.UUID
		var count int
		if err := rows.Scan(&senderID, &count); err != nil {
			return nil, err
		}
		counts[senderID] = count
	}
	return counts, nil
}

// GetDMConversations retorna a lista de conversas de um usuário com contagem de não lidas.
func (r *Repository) GetDMConversations(ctx context.Context, userID uuid.UUID) ([]models.DMConversation, error) {
	rows, err := r.pool.Query(ctx, `
		WITH last_msgs AS (
			SELECT
				CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS friend_id,
				content,
				created_at,
				ROW_NUMBER() OVER (
					PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
					ORDER BY created_at DESC
				) AS rn
			FROM chat_direct_messages
			WHERE sender_id = $1 OR receiver_id = $1
		),
		unread AS (
			SELECT sender_id AS friend_id, COUNT(*) AS cnt
			FROM chat_direct_messages
			WHERE receiver_id = $1 AND read_at IS NULL
			GROUP BY sender_id
		)
		SELECT
			f.user_id,
			u.username,
			COALESCE(unread.cnt, 0) AS unread_count,
			COALESCE(lm.content, '') AS last_message,
			COALESCE(lm.created_at, f.friends_since) AS last_at
		FROM friendships fs
		JOIN users u ON (
			CASE WHEN fs.user_a_id = $1 THEN fs.user_b_id ELSE fs.user_a_id END = u.id
		)
		JOIN (
			SELECT
				CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END AS user_id,
				created_at AS friends_since
			FROM friendships
			WHERE user_a_id = $1 OR user_b_id = $1
		) f ON f.user_id = u.id
		LEFT JOIN last_msgs lm ON lm.friend_id = f.user_id AND lm.rn = 1
		LEFT JOIN unread ON unread.friend_id = f.user_id
		ORDER BY last_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	convs := make([]models.DMConversation, 0)
	for rows.Next() {
		var c models.DMConversation
		if err := rows.Scan(&c.FriendID, &c.Username, &c.UnreadCount, &c.LastMessage, &c.LastAt); err != nil {
			return nil, err
		}
		convs = append(convs, c)
	}
	return convs, nil
}

// AreFriends verifica se dois usuários são amigos.
func (r *Repository) AreFriends(ctx context.Context, userA, userB uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM friendships
			WHERE (user_a_id = $1 AND user_b_id = $2)
			   OR (user_a_id = $2 AND user_b_id = $1)
		)
	`, userA, userB).Scan(&exists)
	return exists, err
}

// CleanOldGlobalMessages deleta mensagens globais mais antigas que N dias.
func (r *Repository) CleanOldGlobalMessages(ctx context.Context, olderThanDays int) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM chat_global_messages
		WHERE created_at < NOW() - ($1 || ' days')::INTERVAL
	`, olderThanDays)
	return err
}
