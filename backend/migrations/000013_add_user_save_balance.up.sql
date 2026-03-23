ALTER TABLE user_progress
    ADD COLUMN save_balance INTEGER NOT NULL DEFAULT 0 CHECK (save_balance >= 0),
    ADD COLUMN save_milestone INTEGER NOT NULL DEFAULT 0 CHECK (save_milestone >= 0);
