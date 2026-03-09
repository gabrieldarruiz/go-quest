CREATE TABLE IF NOT EXISTS achievements (
    id             VARCHAR(50)  PRIMARY KEY,
    level_required SMALLINT     NOT NULL CHECK (level_required BETWEEN 1 AND 10),
    title          VARCHAR(100) NOT NULL,
    description    TEXT         NOT NULL,
    xp_reward      INTEGER      NOT NULL CHECK (xp_reward > 0),
    category       VARCHAR(30)  NOT NULL,
    icon           VARCHAR(10)  NOT NULL,
    sort_order     SMALLINT     NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id),
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id    ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);
