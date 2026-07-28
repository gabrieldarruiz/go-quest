CREATE TABLE cosmetic_items (
    id          VARCHAR(50)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slot        VARCHAR(20)  NOT NULL CHECK (slot IN ('skin', 'hat', 'glasses', 'outfit', 'hand')),
    rarity      VARCHAR(20)  NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    price_coins INTEGER      CHECK (price_coins IS NULL OR price_coins > 0),
    unlock_type VARCHAR(20)  NOT NULL DEFAULT 'default' CHECK (unlock_type IN ('default', 'shop', 'achievement', 'streak_weeks', 'level')),
    unlock_ref  VARCHAR(50),
    sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE user_cosmetics (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id     VARCHAR(50) NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
    source      VARCHAR(30) NOT NULL DEFAULT 'default',
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

CREATE TABLE user_avatar (
    user_id    UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skin       VARCHAR(50) NOT NULL DEFAULT 'skin_azul' REFERENCES cosmetic_items(id),
    hat        VARCHAR(50) REFERENCES cosmetic_items(id),
    glasses    VARCHAR(50) REFERENCES cosmetic_items(id),
    outfit     VARCHAR(50) REFERENCES cosmetic_items(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_avatar_updated_at
    BEFORE UPDATE ON user_avatar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
