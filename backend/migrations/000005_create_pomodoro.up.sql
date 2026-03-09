CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at       TIMESTAMPTZ NOT NULL,
    completed_at     TIMESTAMPTZ NOT NULL,
    duration_minutes SMALLINT    NOT NULL DEFAULT 25,
    session_type     VARCHAR(10) NOT NULL DEFAULT 'work' CHECK (session_type IN ('work', 'break', 'long_break'))
);

CREATE INDEX idx_pomodoro_user_date ON pomodoro_sessions(user_id, started_at);
