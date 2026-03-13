CREATE TABLE streak_partnerships (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'cancelled')),
    streak_days    INTEGER     NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_both_date DATE,
    saves_remaining SMALLINT   NOT NULL DEFAULT 1,
    saves_reset_date DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (requester_id, partner_id),
    CHECK (requester_id <> partner_id)
);

CREATE TABLE partnership_daily (
    partnership_id UUID    NOT NULL REFERENCES streak_partnerships(id) ON DELETE CASCADE,
    user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date  DATE    NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (partnership_id, user_id, activity_date)
);
