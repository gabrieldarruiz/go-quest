CREATE TABLE friendships (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_a_id, user_b_id),
    CHECK (user_a_id <> user_b_id)
);

INSERT INTO friendships (user_a_id, user_b_id, created_at)
SELECT
    CASE WHEN requester_id::text < partner_id::text THEN requester_id ELSE partner_id END AS user_a_id,
    CASE WHEN requester_id::text < partner_id::text THEN partner_id ELSE requester_id END AS user_b_id,
    created_at
FROM streak_partnerships
WHERE status = 'active'
ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
