CREATE TABLE IF NOT EXISTS daily_goals (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
    goal_index   SMALLINT    NOT NULL CHECK (goal_index BETWEEN 0 AND 4),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, goal_date, goal_index)
);

CREATE INDEX idx_daily_goals_user_date ON daily_goals(user_id, goal_date);
