-- Mensagens do chat global
CREATE TABLE IF NOT EXISTS chat_global_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username    TEXT NOT NULL,
    content     VARCHAR(500) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_global_messages_created_at ON chat_global_messages(created_at DESC);

-- Mensagens diretas (DM) entre amigos
CREATE TABLE IF NOT EXISTS chat_direct_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     VARCHAR(500) NOT NULL,
    read_at     TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_dm_conversation ON chat_direct_messages(
    LEAST(sender_id::text, receiver_id::text),
    GREATEST(sender_id::text, receiver_id::text),
    created_at DESC
);
CREATE INDEX idx_chat_dm_receiver_unread ON chat_direct_messages(receiver_id, read_at) WHERE read_at IS NULL;
