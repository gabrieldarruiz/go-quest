CREATE TABLE IF NOT EXISTS user_progress (
    id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_xp      INTEGER    NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    current_level SMALLINT   NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 10),
    streak_days   INTEGER    NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_visit_date DATE     NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
