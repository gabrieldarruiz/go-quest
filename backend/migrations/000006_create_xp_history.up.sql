CREATE TABLE IF NOT EXISTS xp_history (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    xp_gained  INTEGER     NOT NULL CHECK (xp_gained > 0),
    source     VARCHAR(50) NOT NULL,
    source_id  VARCHAR(50) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_history_user ON xp_history(user_id, created_at DESC);
